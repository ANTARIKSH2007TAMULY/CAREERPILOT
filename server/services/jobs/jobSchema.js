import { parseVerifiedPostingDate } from './jobDateUtils.js';

const JOB_TYPES = ['Full-time', 'Internship', 'Contract', 'Part-time'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site', 'Unspecified'];
const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior'];

export const isExplicitlyRemote = (remoteVal) => {
  if (remoteVal === true) return true;
  if (typeof remoteVal === 'string') {
    const s = remoteVal.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'remote';
  }
  return false;
};

export const isExplicitlyNotRemote = (remoteVal) => {
  if (remoteVal === false) return true;
  if (typeof remoteVal === 'string') {
    const s = remoteVal.trim().toLowerCase();
    return s === 'false' || s === '0' || s === 'no';
  }
  return false;
};

export const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

const asString = (value) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

const asDate = (value) => {
  return parseVerifiedPostingDate(value) || undefined;
};

export const mapJobType = (value = '', title = '') => {
  const text = String(value || '').trim();
  if (text) {
    if (/\b(intern|internship|internships|co-op|coop|trainee|apprentice|apprenticeship)\b/i.test(text)) return 'Internship';
    if (/\b(part[-_\s]?time)\b/i.test(text)) return 'Part-time';
    if (/\b(contract|contractor|temporary|temp|freelance)\b/i.test(text)) return 'Contract';
    if (/\b(full[-_\s]?time|permanent)\b/i.test(text)) return 'Full-time';
    if (JOB_TYPES.includes(value)) return value;
  }
  const titleText = String(title || '').trim();
  if (titleText) {
    if (/\b(intern|internship|internships|co-op|coop|trainee|apprentice|apprenticeship)\b/i.test(titleText)) return 'Internship';
    if (/\b(part[-_\s]?time)\b/i.test(titleText)) return 'Part-time';
    if (/\b(contract|contractor|temporary|temp|freelance)\b/i.test(titleText)) return 'Contract';
  }
  return undefined;
};

export const mapWorkMode = (firstArg = '', secondArg = '') => {
  let value = '';
  let title = '';
  let description = '';
  let location = '';
  let remote;

  if (typeof firstArg === 'object' && firstArg !== null) {
    value = firstArg.workMode || firstArg.value || '';
    title = firstArg.title || '';
    description = firstArg.description || '';
    location = firstArg.location || '';
    remote = firstArg.remote;
  } else {
    value = firstArg || '';
    title = secondArg || '';
  }

  const remoteFalse = isExplicitlyNotRemote(remote);
  const remoteTrue = isExplicitlyRemote(remote);

  const cleanVal = String(value || '').trim();
  if (cleanVal === 'Remote' && !remoteFalse) return 'Remote';
  if (cleanVal === 'Hybrid') return 'Hybrid';
  if (cleanVal === 'On-site' || cleanVal === 'Onsite') return 'On-site';
  if (cleanVal === 'Unspecified') return 'Unspecified';

  if (remoteTrue) return 'Remote';

  const combined = `${cleanVal} ${location || ''} ${title || ''} ${description || ''}`.trim();
  if (!combined) return 'Unspecified';

  // 1. Hybrid check
  if (/\b(hybrid|partially remote|part-remote|flexible remote|hybrid work)\b/i.test(combined)) {
    return 'Hybrid';
  }

  // 2. Explicit remote check (exclude remote sensing / remote control)
  if (!remoteFalse && /\b(fully remote|100% remote|work from home|wfh|telecommute|anywhere in the world|remote role|remote position|remote -|remote \/|flexible \/ remote)\b/i.test(combined)) {
    return 'Remote';
  }
  if (!remoteFalse && /\b(remote)\b/i.test(combined) && !/\b(remote sensing|remote control)\b/i.test(combined)) {
    return 'Remote';
  }

  // 3. Explicit on-site check (do not match standalone "office" to avoid Microsoft Office / Office Assistant)
  if (/\b(on[-_\s]?site|in[-_\s]?office|work from office|wfo|at the office|on premise|on-premise)\b/i.test(combined)) {
    return 'On-site';
  }

  return 'Unspecified';
};

export const mapExperienceLevel = (value = '', title = '') => {
  const combined = `${value || ''} ${title || ''}`.trim();
  if (!combined) return undefined;
  if (/\b(intern|internship|entry|junior|jr|graduate|fresh|associate)\b/i.test(combined)) return 'Entry';
  if (/\b(senior|sr|lead|principal|staff|architect|director|head)\b/i.test(combined)) return 'Senior';
  if (/\b(mid|intermediate)\b/i.test(combined)) return 'Mid';
  if (EXPERIENCE_LEVELS.includes(value)) return value;
  return undefined;
};

export const parseSalaryNumber = (salaryString = '') => {
  if (!salaryString) return -1;
  const str = String(salaryString).toLowerCase().trim();
  if (!str || str === 'negotiable' || str === 'competitive' || str === 'flexible') return -1;

  const isHourly = /\/\s*(hr|hour)\b/.test(str) || /\bper\s+hour\b/.test(str);
  const matches = [...str.matchAll(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(k)?/gi)];
  if (!matches.length) return -1;

  const numbers = matches
    .map((m) => {
      let rawStr = m[1];
      if (/^\d+,\d{1,2}$/.test(rawStr)) {
        rawStr = rawStr.replace(',', '.');
      } else {
        rawStr = rawStr.replace(/,/g, '');
      }
      let val = Number(rawStr);
      if (m[2] && m[2].toLowerCase() === 'k') val *= 1000;
      if (isHourly) val *= 2080;
      return val;
    })
    .filter((n) => Number.isFinite(n) && n > 0);

  return numbers.length ? Math.max(...numbers) : -1;
};

export const formatSalaryRange = ({ salary, salaryMin, salaryMax, currency } = {}) => {
  const explicit = asString(salary);
  if (explicit) return explicit;

  const min = Number(salaryMin);
  const max = Number(salaryMax);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;
  if (!hasMin && !hasMax) return '';

  const symbol = asString(currency) || '';
  const formatValue = (value) => `${symbol}${Math.round(value).toLocaleString()}`.trim();
  if (hasMin && hasMax && min !== max) return `${formatValue(min)} - ${formatValue(max)}`;
  return formatValue(hasMin ? min : max);
};

export const normalizeJobRecord = (input = {}) => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const title = asString(input.title);
  const company = asString(input.company);
  const listingUrl = asString(input.listingUrl || input.sourceUrl || input.applyUrl);
  const provider = asString(input.provider || input.source);
  const providerJobId = asString(input.providerJobId);

  if (!title || !company || !listingUrl || !provider) {
    return null;
  }

  const description = stripHtml(input.description || input.summary || '');
  const location = asString(input.location) || '';
  const jobType = mapJobType(input.employmentType || input.jobType, title);
  const workMode = mapWorkMode({
    workMode: input.workMode,
    title,
    description,
    location,
    remote: input.remote,
  });
  const experienceLevel = mapExperienceLevel(input.experienceLevel, title);
  const salary = formatSalaryRange(input);
  const skills = Array.isArray(input.skills)
    ? [...new Set(input.skills.map((skill) => asString(skill)).filter(Boolean))]
    : [];
  const postedAt = asDate(input.postedAt);

  return {
    title,
    company,
    companyLogo: asString(input.companyLogo) || '',
    description: description || title,
    location,
    ...(jobType ? { jobType } : {}),
    workMode,
    ...(experienceLevel ? { experienceLevel } : {}),
    skills,
    salary,
    source: provider,
    providerJobId: providerJobId || '',
    sourceUrl: listingUrl,
    applyUrl: listingUrl,
    postedAt: postedAt || undefined,
    deadline: asDate(input.deadline) || null,
    isActive: true,
    metadata: {
      attribution: asString(input.attribution) || provider,
      originalLocation: input.location || '',
      originalWorkMode: input.workMode || '',
      ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    },
  };
};

export const jobIdentity = (job = {}) => {
  if (job.source && job.providerJobId) return `${job.source}:${job.providerJobId}`;
  if (job.sourceUrl) return job.sourceUrl;
  if (job.applyUrl) return job.applyUrl;
  return '';
};

export const fallbackMatchKey = (job = {}) => {
  const title = String(job.title || '').trim().toLowerCase();
  const company = String(job.company || '').trim().toLowerCase();
  const location = String(job.location || '').trim().toLowerCase();
  if (!title || !company) return '';
  return `${company}::${title}::${location}`;
};

export const dedupeJobs = (jobs = []) => {
  const byIdentity = new Map();
  const byFallback = new Map();
  const unique = [];

  for (const job of jobs) {
    if (!job) continue;
    const identity = jobIdentity(job);
    if (identity) {
      if (byIdentity.has(identity)) continue;
      byIdentity.set(identity, job);
    }

    const fallback = fallbackMatchKey(job);
    if (!identity && fallback) {
      if (byFallback.has(fallback)) continue;
      byFallback.set(fallback, job);
    } else if (identity && fallback && !byFallback.has(fallback)) {
      byFallback.set(fallback, job);
    }

    unique.push(job);
  }

  return unique;
};
