import { ADZUNA_MAX_PAGES, ADZUNA_PAGE_SIZE, fetchAdzunaJobs, hasAdzunaCredentials } from '../adzunaService.js';
import { isMongoConnected } from '../../config/db.js';
import Job from '../../models/Job.js';
import { chunkArray } from '../../utils/mapPool.js';
import { dedupeJobs, jobIdentity } from './jobSchema.js';
import { filterJobsByLast30Days, isJobPostedWithinLast30Days } from './jobDateUtils.js';
import { ingestionManager } from './ingestionManager.js';
import {
  fetchTheMuseJobs,
  hasTheMuseAccess,
  MUSE_MAX_PAGES,
  MUSE_PRIMARY_PAGES,
} from './theMuseService.js';
import { fetchRemotiveJobs, hasRemotiveAccess } from './remotiveService.js';

const PROVIDERS = {
  adzuna: {
    name: 'Adzuna',
    aliases: ['adzuna'],
    configured: () => hasAdzunaCredentials(),
    fetch: (params) =>
      fetchAdzunaJobs({
        ...params,
        limit: ADZUNA_PAGE_SIZE,
        maxPages: params.maxPages || ADZUNA_MAX_PAGES,
      }),
  },
  themuse: {
    name: 'The Muse',
    aliases: ['the muse', 'themuse', 'muse'],
    configured: () => hasTheMuseAccess(),
    fetch: (params) =>
      fetchTheMuseJobs({
        ...params,
        maxPages: params.maxPages || MUSE_PRIMARY_PAGES,
      }),
  },
  remotive: {
    name: 'Remotive',
    aliases: ['remotive'],
    configured: () => hasRemotiveAccess(),
    fetch: (params) =>
      fetchRemotiveJobs({
        ...params,
        fetchAll: true,
      }),
  },
};

const matchesSourceFilter = (source = '') => {
  const value = String(source || '').trim().toLowerCase();
  if (!value || value === 'all') return Object.keys(PROVIDERS);
  return Object.entries(PROVIDERS)
    .filter(([, provider]) => provider.aliases.includes(value) || provider.name.toLowerCase() === value)
    .map(([key]) => key);
};

export const persistJobs = async (jobs = []) => {
  if (!isMongoConnected() || jobs.length === 0) {
    return jobs.map((job) => ({ ...job, _id: job._id || jobIdentity(job) }));
  }

  try {
    const operations = jobs
      .filter((job) => job.sourceUrl || job.applyUrl || job.providerJobId)
      .map((job) => {
        const { _id, ...jobData } = job;
        const filter = job.providerJobId
          ? { source: job.source, providerJobId: job.providerJobId }
          : { sourceUrl: job.sourceUrl || job.applyUrl };
        return {
          updateOne: {
            filter,
            update: { $set: jobData },
            upsert: true,
          },
        };
      });

    for (const chunk of chunkArray(operations, 250)) {
      await Job.bulkWrite(chunk, { ordered: false });
    }

    return jobs.map((job) => ({
      ...job,
      _id: job._id || jobIdentity(job),
    }));
  } catch (error) {
    console.warn('[Jobs] MongoDB upsert warning:', error.message);
    return jobs.map((job) => ({ ...job, _id: job._id || jobIdentity(job) }));
  }
};

const queryCache = new Map();
const QUERY_CACHE_TTL_MS = 15 * 60 * 1000;
const inflight = new Map();
let backfillScheduled = false;
let museBackfillInFlight = false;

const cacheKeyFor = (params = {}) =>
  `catalog:v4:${params.source || 'all'}:${params.keyword || ''}:${params.location || ''}:${params.jobType || ''}:${params.phase || 'primary'}`;

export const searchAggregatedJobs = async (params = {}) => {
  const selected = matchesSourceFilter(params.source);
  const cacheKey = cacheKeyFor(params);
  const cached = queryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const pending = (async () => {
    const providerHealth = [];
    const collected = [];
    let estimatedTotal = 0;

    await Promise.all(
      selected.map(async (key) => {
        const provider = PROVIDERS[key];
        const configured = provider.configured();
        if (!configured) {
          providerHealth.push({
            name: provider.name,
            configured: false,
            operational: false,
            count: 0,
            ingested: 0,
            reportedTotal: 0,
            error: 'Not configured',
          });
          return;
        }

        try {
          const fetched = await provider.fetch(params);
          const jobs = Array.isArray(fetched) ? fetched : [];
          const reportedTotal = Number(fetched.reportedTotal || fetched.totalCount) || jobs.length;
          estimatedTotal += reportedTotal;
          collected.push(...jobs);
          providerHealth.push({
            name: provider.name,
            configured: true,
            operational: true,
            count: jobs.length,
            ingested: jobs.length,
            reportedTotal,
            truncated: Boolean(fetched.truncated),
            exhausted: Boolean(fetched.exhausted),
            stopReason: fetched.stopReason || '',
            note: fetched.note || '',
            apiClaimedTotal: Number(fetched.apiClaimedTotal) || 0,
          });
        } catch (error) {
          providerHealth.push({
            name: provider.name,
            configured: true,
            operational: false,
            count: 0,
            ingested: 0,
            reportedTotal: 0,
            error: error.message,
          });
        }
      })
    );

    const unique = dedupeJobs(collected);
    const eligible = filterJobsByLast30Days(unique);
    const persisted = await persistJobs(eligible);

    const result = {
      jobs: persisted,
      estimatedTotal: Math.max(estimatedTotal, persisted.length),
      fetchedCount: collected.length,
      uniqueCount: unique.length,
      recentCount: eligible.length,
      providers: providerHealth,
    };

    queryCache.set(cacheKey, { result, expiresAt: Date.now() + QUERY_CACHE_TTL_MS });
    return result;
  })();

  inflight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(cacheKey);
  }
};

const EXTRA_ADZUNA_TERMS = [
  'developer',
  'software',
  'engineer',
  'manager',
  'analyst',
  'data',
  'intern',
  'design',
  'product',
  'sales',
  'marketing',
  'finance',
  'consultant',
  'full stack',
];

const backfillTheMuse = async (params = {}) => {
  if (museBackfillInFlight) return;
  museBackfillInFlight = true;
  ingestionManager.startProvider('The Muse');

  try {
    let page = 1;
    let fetchedPages = 0;

    while (fetchedPages < MUSE_MAX_PAGES) {
      const batch = await fetchTheMuseJobs({
        keyword: '',
        location: '',
        page,
        maxPages: 10,
      });

      const jobs = Array.isArray(batch) ? batch : [];
      if (jobs.length > 0) {
        const eligible = filterJobsByLast30Days(jobs);
        if (eligible.length > 0) {
          await persistJobs(eligible);
        }
        ingestionManager.recordBatch('The Muse', {
          pages: 10,
          raw: jobs.length,
          recent30Days: eligible.length,
          validDates: jobs.length,
          insertedOrUpdated: eligible.length,
        });
        console.log('[Jobs] Muse backfill ingested', eligible.length, 'from page', page, 'stop', batch.stopReason || 'batch-complete');
      }

      fetchedPages += 10;
      if (batch.exhausted || batch.stopReason === 'unsupported-page' || batch.stopReason === 'empty' || page >= 100) {
        console.log('[Jobs] Muse catalog exhausted at page cursor', batch.nextPage, batch.stopReason);
        ingestionManager.completeProvider('The Muse', { message: 'Accessible catalog ingested' });
        break;
      }
      if (batch.stopReason === 'rate-limit' || batch.stopReason === 'error') {
        console.warn('[Jobs] Muse backfill paused:', batch.stopReason);
        ingestionManager.recordBatch('The Muse', { isRateLimit: batch.stopReason === 'rate-limit' });
        break;
      }
      page = Number(batch.nextPage) || page + 10;
    }
  } catch (error) {
    console.warn('[Jobs] Muse backfill failed:', error.message);
    ingestionManager.failProvider('The Muse', error);
  } finally {
    museBackfillInFlight = false;
  }
};

export const scheduleCatalogBackfill = (params = {}) => {
  if (backfillScheduled) return;
  backfillScheduled = true;

  setImmediate(async () => {
    if (hasTheMuseAccess()) {
      await backfillTheMuse(params);
    }

    if (!hasAdzunaCredentials()) return;
    ingestionManager.startProvider('Adzuna');

    for (const term of EXTRA_ADZUNA_TERMS) {
      try {
        const jobs = await fetchAdzunaJobs({
          keyword: term,
          location: params.location || '',
          jobType: params.jobType || '',
          page: 1,
          limit: ADZUNA_PAGE_SIZE,
          maxPages: 10,
        });
        const eligible = filterJobsByLast30Days(jobs);
        if (eligible.length > 0) {
          await persistJobs(eligible);
        }
        ingestionManager.recordBatch('Adzuna', {
          pages: 10,
          raw: jobs.rawReceived || jobs.length,
          recent30Days: eligible.length,
          validDates: jobs.length,
          insertedOrUpdated: eligible.length,
        });
        console.log('[Jobs] Adzuna backfill ingested', eligible.length, 'for', term);
      } catch (error) {
        console.warn('[Jobs] Adzuna backfill skipped for', term, error.message);
        ingestionManager.recordBatch('Adzuna', { error });
      }
    }

    ingestionManager.completeProvider('Adzuna', { message: 'Accessible inventory ingested' });
  });
};

export const getConfiguredJobProviders = () =>
  Object.values(PROVIDERS).map((provider) => ({
    name: provider.name,
    configured: provider.configured(),
  }));
