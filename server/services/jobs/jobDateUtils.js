export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Clock skew tolerance: Allow up to 4 hours to accommodate server clock drift
 * and international timezone offsets across distributed job providers.
 * Any job timestamp further into the future than this tolerance is strictly excluded.
 */
export const DEFAULT_CLOCK_SKEW_TOLERANCE_MS = 4 * 60 * 60 * 1000;

/**
 * Parses and verifies a posting date from any provider.
 * Returns a valid Date object if valid and verified, or null if missing/invalid/unparseable.
 * Strictly avoids defaulting to Date.now(), fetch time, or fabricating a date.
 *
 * @param {*} value - Raw date value from provider or database
 * @returns {Date|null} - Verified Date object or null
 */
export const parseVerifiedPostingDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'object' && !(value instanceof Date)) return null;

  let str = value;
  if (typeof str === 'string') {
    str = str.trim();
    if (!str) return null;
    // If string has ISO date-time 'YYYY-MM-DDTHH:mm:ss' without timezone offset or Z, treat as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(str)) {
      str = `${str}Z`;
    }
  }

  const date = str instanceof Date ? str : new Date(str);
  const time = date.getTime();
  if (!Number.isFinite(time) || Number.isNaN(time)) {
    return null;
  }
  return date;
};

/**
 * Computes the exact UTC timestamp boundary for the 30-day window relative to referenceTime.
 *
 * @param {Date|number} [referenceTime=Date.now()]
 * @param {number} [skewToleranceMs=DEFAULT_CLOCK_SKEW_TOLERANCE_MS]
 * @returns {{ cutoffDate: Date, maxFutureDate: Date, cutoffMs: number, maxFutureMs: number }}
 */
export const getThirtyDaysWindow = (
  referenceTime = Date.now(),
  skewToleranceMs = DEFAULT_CLOCK_SKEW_TOLERANCE_MS
) => {
  const refMs = referenceTime instanceof Date ? referenceTime.getTime() : Number(referenceTime) || Date.now();
  const cutoffMs = refMs - THIRTY_DAYS_MS;
  const maxFutureMs = refMs + skewToleranceMs;

  return {
    cutoffDate: new Date(cutoffMs),
    maxFutureDate: new Date(maxFutureMs),
    cutoffMs,
    maxFutureMs,
  };
};

/**
 * Validates whether a job or date timestamp falls strictly within the last 30 days.
 *
 * @param {Object|Date|string|number} jobOrDate - Job object with .postedAt or raw date value
 * @param {Object} [options]
 * @param {Date|number} [options.referenceTime=Date.now()]
 * @param {number} [options.skewToleranceMs=DEFAULT_CLOCK_SKEW_TOLERANCE_MS]
 * @returns {boolean} - true only if verified posting date is within [now - 30d, now + skewTolerance]
 */
export const isJobPostedWithinLast30Days = (
  jobOrDate,
  { referenceTime = Date.now(), skewToleranceMs = DEFAULT_CLOCK_SKEW_TOLERANCE_MS } = {}
) => {
  if (!jobOrDate) return false;

  const rawDate =
    typeof jobOrDate === 'object' && !(jobOrDate instanceof Date) && 'postedAt' in jobOrDate
      ? jobOrDate.postedAt
      : jobOrDate;

  const verifiedDate = parseVerifiedPostingDate(rawDate);
  if (!verifiedDate) return false;

  const timestamp = verifiedDate.getTime();
  const { cutoffMs, maxFutureMs } = getThirtyDaysWindow(referenceTime, skewToleranceMs);

  return timestamp >= cutoffMs && timestamp <= maxFutureMs;
};

/**
 * Filters an array of jobs, returning only those with verified posting dates in the last 30 days.
 *
 * @param {Array<Object>} jobs - Array of job objects
 * @param {Object} [options]
 * @returns {Array<Object>} - Filtered array containing only qualifying jobs
 */
export const filterJobsByLast30Days = (jobs = [], options = {}) => {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((job) => isJobPostedWithinLast30Days(job, options));
};

/**
 * Constructs a MongoDB query filter object ensuring that postedAt matches the 30-day window.
 *
 * @param {Date|number} [referenceTime=Date.now()]
 * @param {number} [skewToleranceMs=DEFAULT_CLOCK_SKEW_TOLERANCE_MS]
 * @returns {{ postedAt: { $gte: Date, $lte: Date } }}
 */
export const buildMongo30DaysDateFilter = (
  referenceTime = Date.now(),
  skewToleranceMs = DEFAULT_CLOCK_SKEW_TOLERANCE_MS
) => {
  const { cutoffDate, maxFutureDate } = getThirtyDaysWindow(referenceTime, skewToleranceMs);
  return {
    postedAt: {
      $gte: cutoffDate,
      $lte: maxFutureDate,
    },
  };
};
