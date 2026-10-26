import { requestJson, HttpError } from '../../utils/httpClient.js';
import { mapPool } from '../../utils/mapPool.js';
import { safeErrorMessage } from '../../utils/redact.js';
import { normalizeJobRecord } from './jobSchema.js';
import { filterJobsByLast30Days, isJobPostedWithinLast30Days, parseVerifiedPostingDate } from './jobDateUtils.js';

const MUSE_BASE = 'https://www.themuse.com/api/public/jobs';
export const MUSE_PAGE_SIZE = 20;
export const MUSE_BATCH_SIZE = 10;
export const MUSE_CONCURRENCY = 5;

const parsePageCap = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Safety cap only. The live public API currently 400s after 0-indexed page 99. */
export const MUSE_MAX_PAGES = parsePageCap(process.env.MUSE_MAX_PAGES, 500);
/** Pages fetched on the request path before background backfill continues. */
export const MUSE_PRIMARY_PAGES = parsePageCap(process.env.MUSE_PRIMARY_PAGES, 100);

export const hasTheMuseCredentials = ({ apiKey = process.env.THEMUSE_API_KEY } = {}) =>
  Boolean(String(apiKey || '').trim());

export const hasTheMuseAccess = () => true;

const mapMuseLevel = (levels = []) => {
  const names = (Array.isArray(levels) ? levels : []).map((level) => level?.name || level).join(' ');
  return names;
};

export const normalizeMuseJob = (result = {}) => {
  const rawLocations = Array.isArray(result.locations) ? result.locations.map((item) => item?.name).filter(Boolean) : [];
  const categories = Array.isArray(result.categories) ? result.categories.map((item) => item?.name).filter(Boolean) : [];
  const listingUrl = result.refs?.landing_page || result.landing_page || '';

  const isFlexibleRemote = rawLocations.some((loc) => /\b(flexible\s*\/\s*remote|remote)\b/i.test(loc));
  const physicalLocations = rawLocations.filter((loc) => !/\b(flexible\s*\/\s*remote|remote)\b/i.test(loc));

  const geographicLocation = physicalLocations.length > 0
    ? physicalLocations.join(', ')
    : isFlexibleRemote
    ? 'Remote'
    : '';

  const workMode = isFlexibleRemote ? 'Remote' : undefined;

  return normalizeJobRecord({
    provider: 'The Muse',
    providerJobId: result.id != null ? String(result.id) : '',
    title: result.name || result.title,
    company: result.company?.name,
    description: result.contents,
    location: geographicLocation,
    workMode,
    remote: isFlexibleRemote,
    experienceLevel: mapMuseLevel(result.levels),
    employmentType: /\b(intern|internship|internships|co-op|coop|trainee|apprentice)\b/i.test(mapMuseLevel(result.levels))
      ? 'Internship'
      : undefined,
    skills: categories,
    postedAt: parseVerifiedPostingDate(result.publication_date),
    listingUrl,
    attribution: 'The Muse',
    metadata: {
      companyShortName: result.company?.short_name || '',
      rawLocations,
    },
  });
};

export const buildMuseSearchUrl = ({ keyword = '', location = '', category = '', page = 1, apiKey = process.env.THEMUSE_API_KEY } = {}) => {
  const musePage = Math.max(0, Number(page) - 1);
  const params = new URLSearchParams();
  params.set('page', String(musePage));
  params.set('descending', 'true');

  if (category) {
    params.append('category', String(category).trim());
  }

  const trimmedKeyword = String(keyword || '').trim();
  const trimmedLocation = String(location || '').trim();

  if (trimmedLocation) {
    params.append('location', trimmedLocation);
  }
  if (/\bremote\b/i.test(`${trimmedKeyword} ${trimmedLocation}`)) {
    params.append('location', 'Flexible / Remote');
  }

  const key = String(apiKey || '').trim();
  if (key) params.set('api_key', key);

  return `${MUSE_BASE}?${params.toString()}`;
};

const attachMeta = (jobs, meta = {}) => {
  const rows = Array.isArray(jobs) ? jobs : [];
  rows.totalCount = meta.totalCount ?? rows.length;
  rows.reportedTotal = meta.reportedTotal ?? rows.length;
  rows.apiClaimedTotal = meta.apiClaimedTotal ?? 0;
  rows.ingested = rows.length;
  rows.truncated = Boolean(meta.truncated);
  rows.exhausted = Boolean(meta.exhausted);
  rows.stopReason = meta.stopReason || '';
  rows.nextPage = meta.nextPage || 1;
  rows.pageCount = meta.pageCount || 0;
  rows.note = meta.note || '';
  return rows;
};

const fetchMusePage = async ({ keyword = '', location = '', page = 1 } = {}) => {
  const url = buildMuseSearchUrl({ keyword, location, page });
  const response = await requestJson({ url });
  const results = Array.isArray(response.json?.results) ? response.json.results : [];
  const normalized = results.map(normalizeMuseJob).filter(Boolean);
  normalized.pageCount = Number(response.json?.page_count) || 0;
  normalized.totalCount = typeof response.json?.total === 'number' ? response.json.total : normalized.length;
  return normalized;
};

const applyKeywordFilter = (jobs, keyword = '') => {
  const trimmedKeyword = String(keyword || '').trim().toLowerCase();
  if (!trimmedKeyword) return jobs;
  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    return haystack.includes(trimmedKeyword);
  });
};

export const fetchTheMuseJobs = async ({
  keyword = '',
  location = '',
  page = 1,
  limit = 12,
  maxPages = 1,
} = {}) => {
  const pagesToFetch = Math.max(1, Number(maxPages) || 1);
  const startPage = Math.max(1, Number(page) || 1);

  try {
    let first;
    try {
      first = await fetchMusePage({ keyword, location, page: startPage });
    } catch (error) {
      if (error instanceof HttpError && error.status === 400 && startPage > 1) {
        return attachMeta([], {
          exhausted: true,
          truncated: false,
          stopReason: 'unsupported-page',
          nextPage: startPage,
          note: 'The Muse rejected this page. Earlier pages were ingested; higher pages are not retrievable.',
        });
      }
      throw error;
    }

    const apiClaimedTotal = Number(first.totalCount) || 0;
    const apiPageCount = Number(first.pageCount) || 0;
    const hardCap = startPage + pagesToFetch - 1;

    if (pagesToFetch === 1) {
      let collected = applyKeywordFilter([...first], keyword);
      const pageSize = Math.min(Math.max(1, Number(limit) || 12), MUSE_PAGE_SIZE);
      collected = collected.slice(0, pageSize);
      return attachMeta(collected, {
        totalCount: collected.length,
        reportedTotal: collected.length,
        apiClaimedTotal,
        pageCount: apiPageCount,
        truncated: true,
        exhausted: first.length === 0,
        stopReason: first.length === 0 ? 'empty' : 'single-page',
        nextPage: startPage + 1,
      });
    }

    if (first.length === 0) {
      return attachMeta([], {
        apiClaimedTotal,
        pageCount: apiPageCount,
        exhausted: true,
        truncated: false,
        stopReason: 'empty',
        nextPage: startPage,
      });
    }

    const collected = [...first];
    let exhausted = false;
    let stopReason = '';
    let nextPage = startPage + 1;

    while (!exhausted && nextPage <= hardCap) {
      const batchEnd = Math.min(hardCap, nextPage + MUSE_BATCH_SIZE - 1);
      const pageNums = [];
      for (let pageNum = nextPage; pageNum <= batchEnd; pageNum += 1) {
        pageNums.push(pageNum);
      }

      const pages = await mapPool(pageNums, MUSE_CONCURRENCY, async (pageNum) => {
        try {
          const rows = await fetchMusePage({ keyword, location, page: pageNum });
          return { pageNum, rows, error: null };
        } catch (error) {
          return { pageNum, rows: null, error };
        }
      });

      pages.sort((a, b) => a.pageNum - b.pageNum);

      let stopBatch = false;
      for (const item of pages) {
        if (item.error) {
          const status = item.error.status;
          if (status === 400) {
            exhausted = true;
            stopReason = 'unsupported-page';
            stopBatch = true;
            console.log('[The Muse] API rejected page', item.pageNum, '(1-based); stopping further requests');
            break;
          }
          if (status === 429) {
            stopReason = 'rate-limit';
            stopBatch = true;
            console.warn('[The Muse] rate limited at page', item.pageNum);
            break;
          }
          console.warn('[The Muse] stopped paging at', item.pageNum, safeErrorMessage(item.error));
          stopReason = 'error';
          stopBatch = true;
          break;
        }

        if (!item.rows || item.rows.length === 0) {
          exhausted = true;
          stopReason = 'empty';
          stopBatch = true;
          break;
        }

        collected.push(...item.rows);
        nextPage = item.pageNum + 1;
      }

      if (stopBatch) break;
    }

    if (!exhausted && !stopReason && nextPage > hardCap) {
      stopReason = 'batch-complete';
    }

    const filtered = applyKeywordFilter(collected, keyword);
    const eligibleJobs = filterJobsByLast30Days(filtered);
    const note =
      exhausted && apiClaimedTotal > eligibleJobs.length
        ? `The Muse advertised ${apiClaimedTotal} listings / ${apiPageCount} pages, but only pages 0-99 (HTTP 200) are retrievable.`
        : '';

    console.log(
      '[The Muse Diagnostics] pagesRequested=',
      Math.max(1, nextPage - startPage),
      'rawCollected=',
      collected.length,
      'recent30Days=',
      eligibleJobs.length,
      'stopReason=',
      stopReason || 'complete'
    );

    return attachMeta(eligibleJobs, {
      totalCount: eligibleJobs.length,
      reportedTotal: eligibleJobs.length,
      apiClaimedTotal,
      pageCount: apiPageCount,
      truncated: !exhausted && nextPage <= hardCap,
      exhausted,
      stopReason,
      nextPage,
      note,
    });
  } catch (error) {
    const wrapped = error instanceof HttpError ? error : new Error(safeErrorMessage(error));
    wrapped.message = `The Muse: ${safeErrorMessage(wrapped)}`;
    wrapped.status = error.status;
    throw wrapped;
  }
};
