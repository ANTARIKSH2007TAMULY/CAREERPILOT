import { requestJson, HttpError } from '../../utils/httpClient.js';
import { safeErrorMessage } from '../../utils/redact.js';
import { cacheService } from '../cacheService.js';
import { mapJobType, normalizeJobRecord } from './jobSchema.js';
import { filterJobsByLast30Days, parseVerifiedPostingDate } from './jobDateUtils.js';
import { ingestionManager } from './ingestionManager.js';

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const CACHE_KEY = 'remotive:public-catalog';
const memoryCache = new Map();

export const REMOTIVE_ATTRIBUTION = 'Jobs by Remotive';

export const hasRemotiveAccess = () => true;

const jobTypeFromRemotive = (value = '', title = '') => mapJobType(String(value || '').replace('_', ' '), title);

export const normalizeRemotiveJob = (result = {}) => {
  const listingUrl = result.url || result.job_url || '';
  const tags = Array.isArray(result.tags) ? result.tags : [];
  const candidateLocation = String(result.candidate_required_location || '').trim();
  const title = String(result.title || '');
  const desc = String(result.description || '');
  const combined = `${title} ${desc} ${candidateLocation}`.toLowerCase();

  let workMode = 'Unspecified';
  if (/\b(hybrid|partially remote|part-remote|hybrid work)\b/i.test(combined)) {
    workMode = 'Hybrid';
  } else if (
    /\b(remote|work from home|wfh|anywhere in the world|telecommute|fully remote|100% remote)\b/i.test(combined) ||
    candidateLocation.toLowerCase() === 'worldwide'
  ) {
    workMode = 'Remote';
  } else if (/\b(on[-_\s]?site|in[-_\s]?office|work from office|wfo)\b/i.test(combined)) {
    workMode = 'On-site';
  }

  // Preserve geographic eligibility (e.g. "USA Only", "Worldwide", "Europe") without defaulting to 'Remote'
  const location = candidateLocation || '';

  return normalizeJobRecord({
    provider: 'Remotive',
    providerJobId: result.id != null ? String(result.id) : '',
    title: result.title,
    company: result.company_name,
    companyLogo: result.company_logo,
    description: result.description,
    location,
    remote: workMode === 'Remote',
    workMode,
    employmentType: jobTypeFromRemotive(result.job_type, result.title),
    salary: result.salary,
    skills: tags,
    postedAt: parseVerifiedPostingDate(result.publication_date),
    listingUrl,
    attribution: REMOTIVE_ATTRIBUTION,
    metadata: {
      category: result.category || '',
      candidateRequiredLocation: candidateLocation,
      legalNotice: 'Link back to the Remotive listing URL and mention Remotive as the source.',
    },
  });
};

/**
 * Official public API has no page/offset pagination. `limit` truncates the payload
 * (default is all). CareerPilot therefore always requests the unfiltered catalog and
 * paginates locally after the 30-day date filter.
 */
export const buildRemotiveSearchUrl = (_params = {}) => REMOTIVE_URL;

export const catalogUrlForRemotive = () => REMOTIVE_URL;

const readCache = async (key) => {
  const cached = await cacheService.get(key);
  if (cached) return cached;
  const local = memoryCache.get(key);
  if (local && local.expiresAt > Date.now()) return local.value;
  return null;
};

const writeCache = async (key, value) => {
  memoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
  await cacheService.set(key, value, CACHE_TTL_SECONDS);
};

const asCount = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

export const interpretRemotivePayload = (payload = {}, { location = '', referenceTime } = {}) => {
  const results = Array.isArray(payload.jobs) ? payload.jobs : [];
  let normalized = results.map(normalizeRemotiveJob).filter(Boolean);
  const trimmedLocation = String(location || '').trim();

  if (trimmedLocation && !/^remote$/i.test(trimmedLocation)) {
    normalized = normalized.filter((job) =>
      String(job.location || '').toLowerCase().includes(trimmedLocation.toLowerCase())
    );
  }

  const eligible = filterJobsByLast30Days(normalized, referenceTime != null ? { referenceTime } : {});
  const reportedTotal = asCount(payload['job-count'], results.length);
  const catalogTotal = asCount(payload['total-job-count'], reportedTotal);

  return {
    results,
    normalized,
    eligible,
    reportedTotal,
    catalogTotal,
    uniqueIds: new Set(results.map((job) => job?.id).filter((id) => id != null)).size,
  };
};

export const remotiveIngestionMessage = ({ rawReceived, reportedTotal, catalogTotal, eligibleCount }) => {
  const publicNote =
    catalogTotal === reportedTotal
      ? `Public API job-count=${reportedTotal}`
      : `Public API job-count=${reportedTotal}, total-job-count=${catalogTotal}`;
  return `${publicNote}; received ${rawReceived} listing(s); ${eligibleCount} posted in the last 30 days`;
};

export const fetchRemotiveJobs = async ({
  keyword = '',
  location = '',
  page = 1,
  limit = 12,
  fetchAll = false,
} = {}) => {
  ingestionManager.startProvider('Remotive');

  try {
    let payload = await readCache(CACHE_KEY);
    if (!payload) {
      // Always fetch the complete public catalog. Keyword search is applied by
      // CareerPilot after upsert; Remotive's public `search`/`limit`/`category`
      // parameters currently return the same curated subset.
      const url = catalogUrlForRemotive();
      const response = await requestJson({ url, timeoutMs: 25000 });
      payload = response.json || {};
      await writeCache(CACHE_KEY, payload);
    }

    const interpreted = interpretRemotivePayload(payload, { location });
    const { results, normalized, eligible, reportedTotal, catalogTotal } = interpreted;

    const trimmedKeyword = String(keyword || '').trim().toLowerCase();
    let matched = eligible;
    if (trimmedKeyword) {
      matched = eligible.filter((job) => {
        const haystack = `${job.title || ''} ${job.company || ''} ${job.description || ''} ${(job.skills || []).join(' ')}`.toLowerCase();
        return haystack.includes(trimmedKeyword);
      });
    }

    const forReturn = fetchAll ? eligible : matched;

    console.log(
      `[Remotive Diagnostics] queries=1, rawReceived=${results.length}, uniqueIds=${interpreted.uniqueIds}, recent30Days=${eligible.length}, jobCount=${reportedTotal}, totalJobCount=${catalogTotal}`
    );

    ingestionManager.recordBatch('Remotive', {
      pages: 1,
      raw: results.length,
      unique: interpreted.uniqueIds || normalized.length,
      validDates: normalized.filter((job) => job.postedAt).length,
      recent30Days: eligible.length,
      insertedOrUpdated: eligible.length,
    });
    ingestionManager.completeProvider('Remotive', {
      ingestedTotal: eligible.length,
      message: remotiveIngestionMessage({
        rawReceived: results.length,
        reportedTotal,
        catalogTotal,
        eligibleCount: eligible.length,
      }),
    });

    const attachMeta = (rows) => {
      rows.totalCount = rows.length;
      rows.reportedTotal = reportedTotal;
      rows.catalogTotal = catalogTotal;
      rows.ingested = rows.length;
      rows.truncated = false;
      rows.note = remotiveIngestionMessage({
        rawReceived: results.length,
        reportedTotal,
        catalogTotal,
        eligibleCount: eligible.length,
      });
      return rows;
    };

    if (!fetchAll) {
      const pageSize = Math.min(Math.max(1, Number(limit) || 12), 50);
      const currentPage = Math.max(1, Number(page) || 1);
      const start = (currentPage - 1) * pageSize;
      return attachMeta(forReturn.slice(start, start + pageSize));
    }

    return attachMeta(forReturn);
  } catch (error) {
    const wrapped = error instanceof HttpError ? error : new Error(safeErrorMessage(error));
    wrapped.message = `Remotive: ${safeErrorMessage(wrapped)}`;
    ingestionManager.failProvider('Remotive', wrapped);
    throw wrapped;
  }
};
