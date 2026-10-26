import Job from '../../models/Job.js';
import { isMongoConnected } from '../../config/db.js';
import { getThirtyDaysWindow } from './jobDateUtils.js';

/**
 * Live Ingestion Manager for CareerPilot job aggregators.
 * Tracks detailed operational counters and status for Adzuna, The Muse, and Remotive.
 */

const createInitialProviderState = (name) => ({
  name,
  status: 'idle', // 'idle' | 'running' | 'completed' | 'failed'
  operational: true,
  configured: true,
  pagesRequested: 0,
  rawReceived: 0,
  uniqueDiscovered: 0,
  validDateCount: 0,
  recent30DaysCount: 0,
  insertedOrUpdated: 0,
  duplicatesSkipped: 0,
  rejectedDateCount: 0,
  errors: [],
  retries: 0,
  rateLimits: 0,
  reportedTotal: 0,
  accessibleLimit: 0,
  ingestedTotal: 0,
  truncated: false,
  message: '',
  startedAt: null,
  completedAt: null,
  lastUpdated: Date.now(),
});

class IngestionManager {
  constructor() {
    this.providers = {
      Adzuna: createInitialProviderState('Adzuna'),
      'The Muse': createInitialProviderState('The Muse'),
      Remotive: createInitialProviderState('Remotive'),
    };
    this.isBackfillRunning = false;
  }

  getProvider(name) {
    const key = name === 'themuse' || name === 'The Muse' ? 'The Muse' : name === 'adzuna' || name === 'Adzuna' ? 'Adzuna' : 'Remotive';
    return this.providers[key];
  }

  startProvider(name, { reportedTotal = 0, accessibleLimit = 0 } = {}) {
    const p = this.getProvider(name);
    if (!p) return;
    p.status = 'running';
    p.startedAt = p.startedAt || new Date().toISOString();
    p.lastUpdated = Date.now();
    p.truncated = true;
    if (reportedTotal > 0) p.reportedTotal = reportedTotal;
    if (accessibleLimit > 0) p.accessibleLimit = accessibleLimit;
    p.message = 'Ingesting pages...';
  }

  recordBatch(name, {
    pages = 1,
    raw = 0,
    unique = 0,
    validDates = 0,
    recent30Days = 0,
    insertedOrUpdated = 0,
    duplicates = 0,
    rejectedDates = 0,
    error = null,
    isRateLimit = false,
  } = {}) {
    const p = this.getProvider(name);
    if (!p) return;

    p.pagesRequested += Number(pages) || 0;
    p.rawReceived += Number(raw) || 0;
    p.uniqueDiscovered += Number(unique) || 0;
    p.validDateCount += Number(validDates) || 0;
    p.recent30DaysCount += Number(recent30Days) || 0;
    p.insertedOrUpdated += Number(insertedOrUpdated) || 0;
    p.duplicatesSkipped += Number(duplicates) || 0;
    p.rejectedDateCount += Number(rejectedDates) || 0;
    p.lastUpdated = Date.now();

    if (error) {
      p.errors.push(String(error.message || error).slice(0, 200));
      if (p.errors.length > 10) p.errors.shift();
    }
    if (isRateLimit) {
      p.rateLimits += 1;
    }
  }

  completeProvider(name, { message = 'Ingestion complete', ingestedTotal = 0 } = {}) {
    const p = this.getProvider(name);
    if (!p) return;
    p.status = 'completed';
    p.truncated = false;
    p.completedAt = new Date().toISOString();
    p.lastUpdated = Date.now();
    p.message = message;
    if (ingestedTotal > 0) {
      p.ingestedTotal = ingestedTotal;
    }
  }

  failProvider(name, error) {
    const p = this.getProvider(name);
    if (!p) return;
    p.status = 'failed';
    p.truncated = false;
    p.operational = false;
    p.completedAt = new Date().toISOString();
    p.lastUpdated = Date.now();
    p.message = String(error?.message || error || 'Ingestion failed');
    p.errors.push(p.message);
  }

  async getLiveStatus() {
    const { cutoffDate, maxFutureDate } = getThirtyDaysWindow();

    // Query real current database counts for accuracy
    let dbCounts = new Map();
    if (isMongoConnected()) {
      try {
        const counts = await Job.aggregate([
          {
            $match: {
              isActive: true,
              postedAt: { $gte: cutoffDate, $lte: maxFutureDate },
            },
          },
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ]);
        counts.forEach((c) => dbCounts.set(c._id, c.count));
      } catch (err) {
        console.warn('[IngestionManager] DB count lookup failed:', err.message);
      }
    }

    const result = {};
    for (const [key, state] of Object.entries(this.providers)) {
      const realDbCount = dbCounts.get(key) || 0;
      const effectiveIngested = Math.max(state.insertedOrUpdated, state.recent30DaysCount, realDbCount);
      result[key] = {
        ...state,
        ingestedTotal: effectiveIngested,
        dbCount30Days: realDbCount,
        // Only mark truncated if actively running or if we haven't reached the accessible limit
        truncated: state.status === 'running',
      };
    }
    return result;
  }
}

export const ingestionManager = new IngestionManager();
