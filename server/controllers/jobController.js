import Job from '../models/Job.js';
import { fetchAdzunaJobs, upsertAdzunaJobs } from '../services/adzunaService.js';
import asyncHandler from '../utils/asyncHandler.js';

const parseArrayField = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const dedupeJobs = (jobs = []) => {
  const unique = new Map();

  jobs.forEach((job) => {
    const key = job.sourceUrl || job.applyUrl || `${job.company}-${job.title}-${job.location}`;
    if (!key) return;
    if (!unique.has(key)) {
      unique.set(key, job);
    }
  });

  return Array.from(unique.values());
};

export const getJobs = asyncHandler(async (req, res) => {
  const {
    keyword = '',
    location = '',
    jobType = '',
    workMode = '',
    experienceLevel = '',
    skills = '',
    source = '',
    page = 1,
    limit = 12,
    sort = 'newest',
  } = req.query;

  const filter = { isActive: true };

  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { company: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (jobType) {
    filter.jobType = jobType;
  }

  if (workMode) {
    filter.workMode = workMode;
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  if (skills) {
    const skillFilters = parseArrayField(skills);
    if (skillFilters.length > 0) {
      filter.skills = { $in: skillFilters.map((skill) => new RegExp(skill, 'i')) };
    }
  }

  if (source) {
    filter.source = { $regex: source, $options: 'i' };
  }

  const sortMap = {
    newest: { postedAt: -1 },
    oldest: { postedAt: 1 },
    salary: { salary: -1 },
    title: { title: 1 },
  };

  const dbJobs = await Job.find(filter)
    .sort(sortMap[sort] || sortMap.newest)
    .lean();

  const normalizedLimit = Math.max(1, Number(limit) || 12);
  const currentPage = Math.max(1, Number(page) || 1);
  const shouldUseAdzuna = !source || source.toLowerCase() === 'adzuna' || source.toLowerCase() === 'all';

  let providerJobs = [];
  if (shouldUseAdzuna) {
    try {
      providerJobs = await fetchAdzunaJobs({
        keyword,
        location,
        page: currentPage,
        limit: normalizedLimit,
      });

      if (providerJobs.length > 0) {
        await upsertAdzunaJobs(providerJobs);
      }
    } catch (error) {
      console.error('[Jobs] Adzuna provider unavailable:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Job provider temporarily unavailable',
      });
    }
  }

  const combinedJobs = dedupeJobs([...dbJobs, ...providerJobs]);
  const sortedJobs = [...combinedJobs].sort((a, b) => {
    const sortValue = sortMap[sort] || sortMap.newest;
    const field = Object.keys(sortValue)[0];
    const direction = sortValue[field] === -1 ? -1 : 1;

    if (field === 'postedAt') {
      const aTime = new Date(a[field]).getTime();
      const bTime = new Date(b[field]).getTime();
      return direction * (aTime > bTime ? 1 : aTime < bTime ? -1 : 0);
    }

    if (field === 'salary') {
      const aSalary = Number(String(a.salary).replace(/[^\d]/g, '')) || 0;
      const bSalary = Number(String(b.salary).replace(/[^\d]/g, '')) || 0;
      return direction * (aSalary > bSalary ? 1 : aSalary < bSalary ? -1 : 0);
    }

    const aValue = String(a[field] ?? '');
    const bValue = String(b[field] ?? '');
    return direction * (aValue > bValue ? 1 : aValue < bValue ? -1 : 0);
  });

  const startIndex = (currentPage - 1) * normalizedLimit;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + normalizedLimit);

  return res.status(200).json({
    success: true,
    data: {
      jobs: paginatedJobs,
      pagination: {
        page: currentPage,
        limit: normalizedLimit,
        totalPages: Math.max(1, Math.ceil(sortedJobs.length / normalizedLimit)),
        totalItems: sortedJobs.length,
      },
    },
  });
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: { job },
  });
});
