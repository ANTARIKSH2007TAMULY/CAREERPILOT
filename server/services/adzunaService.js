import https from 'node:https';
import Job from '../models/Job.js';

const ADZUNA_REQUEST_TIMEOUT_MS = 15000;
/** Prefer IPv4: undici fetch can fail when IPv6 is unreachable on the host network. */
const ADZUNA_CONNECT_FAMILY = 4;

const DEFAULT_ADZUNA_APP_ID = 'test-app-id';
const DEFAULT_ADZUNA_APP_KEY = 'test-app-key';

const STOP_WORDS = new Set([
  'the', 'with', 'that', 'this', 'from', 'your', 'have', 'into', 'over', 'their', 'about',
  'there', 'will', 'been', 'where', 'what', 'when', 'should', 'could', 'would', 'build',
  'teams', 'working', 'through', 'across', 'using', 'within', 'after', 'before', 'other',
  'skills', 'experience', 'engineer', 'engineering', 'developer', 'development', 'product',
]);

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

const formatSalary = (salaryMin, salaryMax) => {
  if (!salaryMin && !salaryMax) return '';

  const min = Number(salaryMin || salaryMax || 0);
  const max = Number(salaryMax || salaryMin || 0);

  if (!min && !max) return '';

  const currency = min >= 50000 || max >= 50000 ? '£' : '$';
  const formatValue = (value) => Math.round(value).toLocaleString();

  if (min && max && min !== max) {
    return `${currency}${formatValue(min)} - ${currency}${formatValue(max)}`;
  }

  const singleValue = min || max;
  return `${currency}${formatValue(singleValue)}`;
};

const inferJobType = (result = {}) => {
  const contractType = String(result.contract_type || '').toLowerCase();
  const contractTime = String(result.contract_time || '').toLowerCase();

  if (contractTime === 'part_time') return 'Part-time';
  if (contractType === 'contract' || contractType === 'temporary') return 'Contract';
  if (contractType === 'internship') return 'Internship';
  return 'Full-time';
};

const inferWorkMode = (result = {}, fallbackLocation = '') => {
  const location = `${result.location?.display_name || fallbackLocation || ''} ${result.title || ''}`.toLowerCase();

  if (location.includes('remote')) return 'Remote';
  if (location.includes('hybrid')) return 'Hybrid';
  return 'On-site';
};

const inferExperienceLevel = (value = '') => {
  const text = value.toLowerCase();

  if (text.includes('senior') || text.includes('lead')) return 'Senior';
  if (text.includes('mid') || text.includes('intermediate')) return 'Mid';
  if (text.includes('intern')) return 'Entry';
  return 'Entry';
};

const extractSkills = (title = '', description = '') => {
  const text = `${title} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && !/^https?$/.test(word))
    .slice(0, 8);

  const unique = [...new Set(text)];
  if (unique.length > 0) return unique;

  return ['Communication', 'Problem Solving'];
};

export const normalizeAdzunaJob = (result = {}, fallbackLocation = '') => {
  const title = String(result.title || 'New Opportunity').trim();
  const companyName = String(result.company?.display_name || 'Adzuna').trim();
  const location = String(result.location?.display_name || fallbackLocation || 'Remote').trim();
  const description = String(
    result.description ||
      `${title} with ${companyName}. Explore this opportunity and apply today.`
  ).trim();
  const salary = formatSalary(result.salary_min, result.salary_max);
  const skills = extractSkills(title, description);

  return {
    title,
    company: companyName,
    companyLogo: String(result.company?.logo || '').trim(),
    description,
    location,
    jobType: inferJobType(result),
    workMode: inferWorkMode(result, fallbackLocation),
    experienceLevel: inferExperienceLevel(`${title} ${description}`),
    skills,
    salary,
    source: 'Adzuna',
    sourceUrl: String(result.redirect_url || result.url || '').trim(),
    applyUrl: String(result.redirect_url || result.url || '').trim(),
    postedAt: result.created ? new Date(result.created) : new Date(),
    deadline: null,
    isActive: true,
  };
};

export const buildAdzunaSearchUrl = ({ keyword = '', location = '', page = 1, limit = 12 } = {}) => {
  const appId = process.env.ADZUNA_APP_ID || DEFAULT_ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY || DEFAULT_ADZUNA_APP_KEY;
  const queryPage = Number(page) || 1;
  const resultsPerPage = Math.min(Number(limit) || 12, 50);
  const countryCode = (process.env.ADZUNA_COUNTRY || 'in').trim() || 'in';

  const searchUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${queryPage}`;
  const params = [
    `app_id=${encodeURIComponent(appId)}`,
    `app_key=${encodeURIComponent(appKey)}`,
    `results_per_page=${encodeURIComponent(String(resultsPerPage))}`,
    `page=${encodeURIComponent(String(queryPage))}`,
  ];

  if (keyword) params.push(`what=${encodeURIComponent(keyword)}`);
  if (location) params.push(`where=${encodeURIComponent(location)}`);

  console.log('[Adzuna] endpoint:', `/v1/api/jobs/${countryCode}/search/${queryPage}`);
  console.log('[Adzuna] keyword:', keyword || 'not provided');
  console.log('[Adzuna] location:', location || 'not provided');
  console.log('[Adzuna] credentials configured:', Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY));

  return `${searchUrl}?${params.join('&')}`;
};

export const fetchAdzunaJobs = async ({ keyword = '', location = '', page = 1, limit = 12 } = {}) => {
  if (!hasAdzunaCredentials()) {
    console.error('[Adzuna] Missing credentials. ADZUNA_APP_ID configured: false; ADZUNA_APP_KEY configured: false');
    throw new Error('Adzuna credentials are not configured');
  }

  const url = buildAdzunaSearchUrl({ keyword, location, page, limit });

  try {
    const response = await fetch(url);
    console.log('[Adzuna] HTTP status:', response.status);

    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];
    console.log('[Adzuna] result count:', results.length);

    if (!response.ok) {
      const safeMessage = payload?.message || payload?.error || response.statusText || 'Unknown error';
      console.error('[Adzuna] provider error:', safeMessage);
      throw new Error(`Adzuna request failed with status ${response.status}`);
    }

    const normalized = results.map((job) => normalizeAdzunaJob(job, location));
    const successful = normalized.filter(Boolean).length;
    const failed = results.length - successful;
    console.log('[Adzuna] successfully normalized:', successful);
    console.log('[Adzuna] failed normalization:', failed);
    return normalized.filter(Boolean);
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
    const operations = jobs.map((job) => ({
      updateOne: {
        filter: { sourceUrl: job.sourceUrl || job.applyUrl },
        update: { $set: { ...job, source: 'Adzuna' } },
        upsert: true,
      },
    }));

    const result = await Job.bulkWrite(operations, { ordered: false });
    return result?.upsertedCount || 0;
  } catch (error) {
    console.warn('Adzuna sync to MongoDB failed:', error.message);
    return 0;
  }
};
