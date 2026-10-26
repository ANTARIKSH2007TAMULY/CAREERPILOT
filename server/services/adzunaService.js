import https from 'node:https';
import Job from '../models/Job.js';
import { mapPool } from '../utils/mapPool.js';
import { normalizeJobRecord } from './jobs/jobSchema.js';
import { filterJobsByLast30Days, isJobPostedWithinLast30Days, parseVerifiedPostingDate } from './jobs/jobDateUtils.js';

const ADZUNA_REQUEST_TIMEOUT_MS = 15000;
/** Prefer IPv4: undici fetch can fail when IPv6 is unreachable on the host network. */
const ADZUNA_CONNECT_FAMILY = 4;

const DEFAULT_ADZUNA_APP_ID = 'test-app-id';
const DEFAULT_ADZUNA_APP_KEY = 'test-app-key';

export const hasAdzunaCredentials = ({ appId = process.env.ADZUNA_APP_ID, appKey = process.env.ADZUNA_APP_KEY } = {}) => {
  return Boolean(String(appId || '').trim() && String(appKey || '').trim());
};

const adzunaHttpsGet = (urlString, { signal } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        family: ADZUNA_CONNECT_FAMILY,
        headers: {
          Accept: 'application/json',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('error', reject);

    req.setTimeout(ADZUNA_REQUEST_TIMEOUT_MS, () => {
      req.destroy(Object.assign(new Error(`Connect or request timed out after ${ADZUNA_REQUEST_TIMEOUT_MS}ms`), { code: 'ETIMEDOUT' }));
    });

    if (signal) {
      if (signal.aborted) {
        req.destroy(Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR' }));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          req.destroy(Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR' }));
        },
        { once: true }
      );
    }

    req.end();
  });

const inferJobType = (result = {}) => {
  const contractType = String(result.contract_type || '').toLowerCase();
  const contractTime = String(result.contract_time || '').toLowerCase();
  const title = String(result.title || '');

  // 1. Structured provider fields first
  if (contractTime === 'part_time') return 'Part-time';
  if (contractType === 'internship') return 'Internship';
  if (contractType === 'contract' || contractType === 'temporary') return 'Contract';
  if (contractTime === 'full_time' || contractType === 'permanent') return 'Full-time';

  // 2. Conservative title-based check with word boundaries (never match "internal" or description text)
  if (/\b(intern|internship|internships|co-op|coop|trainee|apprentice|apprenticeship)\b/i.test(title)) return 'Internship';
  if (/\b(part[-_\s]?time)\b/i.test(title)) return 'Part-time';
  if (/\b(contract|contractor|freelance|temp|temporary)\b/i.test(title)) return 'Contract';

  return undefined;
};

const inferWorkMode = (result = {}, fallbackLocation = '') => {
  const loc = String(result.location?.display_name || fallbackLocation || '');
  const title = String(result.title || '');
  const desc = String(result.description || '');
  const text = `${loc} ${title} ${desc}`.toLowerCase();

  // 1. Check for hybrid
  if (/\b(hybrid|partially remote|part-remote|hybrid work)\b/i.test(text)) return 'Hybrid';

  // 2. Check for explicit remote (exclude "remote control", "remote sensing")
  if (/\b(fully remote|100% remote|work from home|wfh|telecommute|anywhere in the world|remote role|remote position|remote -|remote \/|flexible \/ remote)\b/i.test(text)) {
    return 'Remote';
  }
  if (/\b(remote)\b/i.test(text) && !/\b(remote sensing|remote control)\b/i.test(text)) {
    return 'Remote';
  }

  // 3. Check for explicit on-site (do not match standalone "office" to avoid Microsoft Office / Office Assistant)
  if (/\b(on[-_\s]?site|in[-_\s]?office|work from office|wfo|at the office|on premise|on-premise)\b/i.test(text)) {
    return 'On-site';
  }

  // A city/country alone or normal description does NOT prove on-site or remote
  return 'Unspecified';
};

export const normalizeAdzunaJob = (result = {}, fallbackLocation = '') => {
  const loc = result.location?.display_name || fallbackLocation || '';
  const workMode = inferWorkMode(result, fallbackLocation);

  return normalizeJobRecord({
    provider: 'Adzuna',
    providerJobId: result.id != null ? String(result.id) : '',
    title: result.title,
    company: result.company?.display_name,
    companyLogo: result.company?.logo,
    description: result.description,
    location: loc,
    employmentType: inferJobType(result),
    workMode,
    remote: workMode === 'Remote',
    experienceLevel: `${result.title || ''}`,
    salaryMin: result.salary_min,
    salaryMax: result.salary_max,
    postedAt: parseVerifiedPostingDate(result.created),
    listingUrl: result.redirect_url || result.url,
    metadata: {
      rawArea: result.location?.area || [],
      rawDisplayName: result.location?.display_name || '',
    },
  });
};

export const buildAdzunaSearchUrl = ({ keyword = '', location = '', page = 1, limit = 12, jobType = '' } = {}) => {
  const appId = process.env.ADZUNA_APP_ID || DEFAULT_ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY || DEFAULT_ADZUNA_APP_KEY;
  const queryPage = Math.max(1, Number(page) || 1);
  const resultsPerPage = Math.min(Math.max(1, Number(limit) || 12), 50);
  const countryCode = (process.env.ADZUNA_COUNTRY || 'in').trim() || 'in';

  const searchUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${queryPage}`;
  const params = [
    `app_id=${encodeURIComponent(appId)}`,
    `app_key=${encodeURIComponent(appKey)}`,
    `results_per_page=${encodeURIComponent(String(resultsPerPage))}`,
    'max_days_old=30',
  ];

  const trimmedKeyword = keyword ? String(keyword).trim() : '';
  const trimmedLocation = location ? String(location).trim() : '';
  const isInternship = /\bintern/i.test(jobType);

  let searchTerm = trimmedKeyword;
  if (isInternship) {
    if (!searchTerm) {
      searchTerm = 'internship';
    } else if (!/\bintern/i.test(searchTerm)) {
      searchTerm = `${searchTerm} internship`;
    }
  }

  if (searchTerm) {
    params.push(`what=${encodeURIComponent(searchTerm)}`);
  } else if (!trimmedLocation) {
    // Adzuna requires a query term if no location is specified
    params.push('what=developer');
  }

  if (trimmedLocation) {
    params.push(`where=${encodeURIComponent(trimmedLocation)}`);
  }

  return `${searchUrl}?${params.join('&')}`;
};

export const ADZUNA_PAGE_SIZE = 50;
export const ADZUNA_MAX_PAGES = Math.max(1, Number(process.env.ADZUNA_MAX_PAGES) || 50);

const fetchAdzunaPage = async ({ keyword = '', location = '', page = 1, limit = ADZUNA_PAGE_SIZE, jobType = '' } = {}) => {
  const url = buildAdzunaSearchUrl({ keyword, location, page, limit, jobType });
  const response = await adzunaHttpsGet(url);
  let payload = {};
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error(`Invalid JSON received from Adzuna (HTTP ${response.status})`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Adzuna request failed with status ${response.status}`);
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const normalized = results.map((job) => normalizeAdzunaJob(job, location)).filter(Boolean);
  const eligible = filterJobsByLast30Days(normalized);
  eligible.totalCount = typeof payload.count === 'number' ? payload.count : eligible.length;
  eligible.rawCount = results.length;
  return eligible;
};

export const fetchAdzunaJobs = async ({
  keyword = '',
  location = '',
  page = 1,
  limit = 12,
  jobType = '',
  maxPages = 1,
} = {}) => {
  if (!hasAdzunaCredentials()) {
    console.error('[Adzuna] Missing credentials. ADZUNA_APP_ID configured: false; ADZUNA_APP_KEY configured: false');
    throw new Error('Adzuna credentials are not configured');
  }

  const pagesToFetch = Math.max(1, Number(maxPages) || 1);
  const startPage = Math.max(1, Number(page) || 1);
  const perPage = pagesToFetch > 1 ? ADZUNA_PAGE_SIZE : Math.min(Math.max(1, Number(limit) || 12), ADZUNA_PAGE_SIZE);
  const pageNumbers = Array.from({ length: pagesToFetch }, (_, index) => startPage + index);

  try {
    const pageResults = await mapPool(pageNumbers, 4, async (pageNum) => {
      try {
        return await fetchAdzunaPage({ keyword, location, page: pageNum, limit: perPage, jobType });
      } catch (error) {
        if (pageNum === startPage) throw error;
        console.warn('[Adzuna] stopped paging at', pageNum, error.message);
        return null;
      }
    });

    const collected = [];
    let reportedTotal = 0;
    let totalRawReceived = 0;
    for (const pageJobs of pageResults) {
      if (!pageJobs || pageJobs.length === 0) continue;
      reportedTotal = Math.max(reportedTotal, Number(pageJobs.totalCount) || 0);
      totalRawReceived += Number(pageJobs.rawCount) || pageJobs.length;
      collected.push(...pageJobs);
    }

    const eligibleJobs = filterJobsByLast30Days(collected);
    eligibleJobs.totalCount = reportedTotal || eligibleJobs.length;
    eligibleJobs.reportedTotal = reportedTotal;
    eligibleJobs.ingested = eligibleJobs.length;
    eligibleJobs.rawReceived = totalRawReceived;
    eligibleJobs.truncated = reportedTotal > eligibleJobs.length;
    eligibleJobs.jobs = eligibleJobs;

    console.log(
      `[Adzuna Diagnostics] queries=1, pagesRequested=${pagesToFetch}, rawReceived=${totalRawReceived}, recent30Days=${eligibleJobs.length}, reportedTotal=${reportedTotal}`
    );
    return eligibleJobs;
  } catch (error) {
    console.error('[Adzuna] fetch failed:', error.message);
    throw error;
  }
};

export const upsertAdzunaJobs = async (jobs = []) => {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }

  try {
    const operations = jobs.map((job) => {
      const { _id, ...jobData } = job;
      return {
        updateOne: {
          filter: { sourceUrl: job.sourceUrl || job.applyUrl },
          update: { $set: { ...jobData, source: 'Adzuna' } },
          upsert: true,
        },
      };
    });

    await Job.bulkWrite(operations, { ordered: false });

    // Retrieve saved documents to get their real MongoDB _ids
    const sourceUrls = jobs.map((j) => j.sourceUrl || j.applyUrl).filter(Boolean);
    const dbDocs = await Job.find({ sourceUrl: { $in: sourceUrls } }).lean();
    const docMap = new Map();
    dbDocs.forEach((doc) => {
      const key = doc.sourceUrl || doc.applyUrl;
      if (key) docMap.set(key, doc);
    });

    return jobs.map((job) => {
      const key = job.sourceUrl || job.applyUrl;
      const matched = docMap.get(key);
      if (matched) {
        return {
          ...matched,
          _id: String(matched._id),
        };
      }
      return job;
    });
  } catch (error) {
    console.warn('Adzuna sync to MongoDB failed:', error.message);
    return jobs;
  }
};
