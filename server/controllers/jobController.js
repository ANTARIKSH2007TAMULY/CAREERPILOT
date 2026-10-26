import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { isMongoConnected } from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import { scheduleCatalogBackfill, searchAggregatedJobs } from '../services/jobs/jobAggregator.js';
import { jobIdentity, parseSalaryNumber } from '../services/jobs/jobSchema.js';
import { getThirtyDaysWindow, isJobPostedWithinLast30Days } from '../services/jobs/jobDateUtils.js';
import { ingestionManager } from '../services/jobs/ingestionManager.js';

const parseArrayField = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseDateMs = (val) => {
  if (!val) return 0;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const tieBreak = (a, b) => {
  const idA = String(a._id || a.providerJobId || a.sourceUrl || a.title || '');
  const idB = String(b._id || b.providerJobId || b.sourceUrl || b.title || '');
  return idA.localeCompare(idB);
};

export const sortJobs = (jobs = [], sortKey = 'newest') => {
  return [...jobs].sort((a, b) => {
    if (sortKey === 'oldest') {
      const diff = parseDateMs(a.postedAt) - parseDateMs(b.postedAt);
      if (diff !== 0) return diff;
      return tieBreak(a, b);
    }
    if (sortKey === 'title') {
      const diff = String(a.title || '').localeCompare(String(b.title || ''));
      if (diff !== 0) return diff;
      return tieBreak(a, b);
    }
    if (sortKey === 'salary') {
      const aSalary = parseSalaryNumber(a.salary);
      const bSalary = parseSalaryNumber(b.salary);
      const diff = bSalary - aSalary;
      if (diff !== 0) return diff;
      return tieBreak(a, b);
    }
    // newest (default)
    const diff = parseDateMs(b.postedAt) - parseDateMs(a.postedAt);
    if (diff !== 0) return diff;
    return tieBreak(a, b);
  });
};

export const matchesFilters = (
  job,
  { cleanKeyword, cleanLocation, cleanJobType, cleanWorkMode, cleanExperienceLevel, skillFilters = [], cleanSource }
) => {
  if (job.postedAt && !isJobPostedWithinLast30Days(job)) return false;

  if (cleanJobType) {
    const isInternTarget = /^intern/i.test(cleanJobType);
    if (isInternTarget) {
      const isIntern =
        /^intern/i.test(String(job.jobType || '')) ||
        /\b(intern|internship|internships|co-op|coop|trainee|apprentice)\b/i.test(String(job.title || ''));
      if (!isIntern) return false;
    } else {
      if (!String(job.jobType || '').toLowerCase().includes(cleanJobType.toLowerCase())) return false;
    }
  }

  if (cleanWorkMode) {
    if (!String(job.workMode || '').toLowerCase().includes(cleanWorkMode.toLowerCase())) return false;
  }

  if (cleanExperienceLevel) {
    if (!String(job.experienceLevel || '').toLowerCase().includes(cleanExperienceLevel.toLowerCase())) return false;
  }

  if (cleanSource && cleanSource.toLowerCase() !== 'all') {
    if (!String(job.source || '').toLowerCase().includes(cleanSource.toLowerCase())) return false;
  }

  if (cleanLocation) {
    const locLower = cleanLocation.toLowerCase();
    const isRemote = /^remote$/i.test(locLower);
    const jobLoc = String(job.location || '').toLowerCase();
    const jobWork = String(job.workMode || '').toLowerCase();
    const matchesLoc = jobLoc.includes(locLower) || (isRemote && jobWork === 'remote');
    if (!matchesLoc) return false;
  }

  if (cleanKeyword) {
    const kw = cleanKeyword.toLowerCase();
    const haystack = `${job.title || ''} ${job.company || ''} ${job.description || ''} ${(job.skills || []).join(' ')}`.toLowerCase();
    if (!haystack.includes(kw)) return false;
  }

  if (skillFilters.length > 0) {
    const jobSkills = (job.skills || []).map((s) => String(s).toLowerCase());
    if (!skillFilters.some((sf) => jobSkills.some((item) => item.includes(sf.toLowerCase())))) return false;
  }

  return true;
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

  const cleanJobType = !jobType || jobType.toLowerCase() === 'all' ? '' : jobType.trim();
  const cleanWorkMode = !workMode || workMode.toLowerCase() === 'all' ? '' : workMode.trim();
  const cleanExperienceLevel = !experienceLevel || experienceLevel.toLowerCase() === 'all' ? '' : experienceLevel.trim();
  const cleanKeyword = keyword ? String(keyword).trim() : '';
  const cleanLocation = location ? String(location).trim() : '';
  const cleanSource = source ? String(source).trim() : '';
  const cleanSort = ['newest', 'oldest', 'salary', 'title'].includes(String(sort).toLowerCase())
    ? String(sort).toLowerCase()
    : 'newest';
  const skillFilters = skills ? parseArrayField(skills) : [];

  const normalizedLimit = Math.min(Math.max(1, Number(limit) || 12), 50);
  const currentPage = Math.max(1, Number(page) || 1);

  let providerMetadata = [];
  let catalogMeta = {};
  try {
    const aggregated = await searchAggregatedJobs({
      keyword: cleanKeyword,
      location: cleanLocation,
      jobType: cleanJobType,
      source: cleanSource,
    });
    providerMetadata = aggregated.providers || [];
    catalogMeta = {
      fetchedCount: aggregated.fetchedCount,
      uniqueCount: aggregated.uniqueCount,
      estimatedTotal: aggregated.estimatedTotal,
    };
    scheduleCatalogBackfill({
      keyword: cleanKeyword,
      location: cleanLocation,
      jobType: cleanJobType,
      source: cleanSource,
    });
  } catch (err) {
    console.warn('[Jobs] Provider aggregation warning:', err.message);
  }

  if (isMongoConnected()) {
    const { cutoffDate, maxFutureDate } = getThirtyDaysWindow();
    const filter = {
      isActive: true,
      postedAt: { $gte: cutoffDate, $lte: maxFutureDate },
    };

    if (cleanKeyword) {
      const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: regex },
        { company: regex },
        { description: regex },
        { skills: regex },
      ];
    }

    if (cleanLocation) {
      const escaped = cleanLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isRemote = /^remote$/i.test(cleanLocation);
      if (isRemote) {
        filter.$or = [
          { location: new RegExp(escaped, 'i') },
          { workMode: /^remote$/i },
        ];
      } else {
        filter.location = new RegExp(escaped, 'i');
      }
    }

    if (cleanJobType) {
      if (/^intern/i.test(cleanJobType)) {
        filter.$or = [
          { jobType: { $regex: /^(intern|internship|internships|co-op|coop)$/i } },
          { title: { $regex: /\b(intern|internship|internships|co-op|coop|trainee|apprentice)\b/i } },
        ];
      } else if (/^part/i.test(cleanJobType)) {
        filter.jobType = { $regex: /^part[-_\s]?time$/i };
      } else if (/^contract/i.test(cleanJobType)) {
        filter.jobType = { $regex: /^(contract|contractor|temporary|temp|freelance)$/i };
      } else if (/^full/i.test(cleanJobType)) {
        filter.jobType = { $regex: /^(full[-_\s]?time|permanent)$/i };
      } else {
        filter.jobType = { $regex: `^${cleanJobType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
      }
    }

    if (cleanWorkMode) {
      filter.workMode = { $regex: `^${cleanWorkMode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    if (cleanExperienceLevel) {
      filter.experienceLevel = { $regex: `^${cleanExperienceLevel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    if (skillFilters.length > 0) {
      filter.skills = {
        $in: skillFilters.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
      };
    }

    if (cleanSource && cleanSource.toLowerCase() !== 'all') {
      filter.source = { $regex: `^${cleanSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    const totalMatching = await Job.countDocuments(filter);
    let pageJobs = [];

    if (cleanSort === 'salary') {
      // Custom salary normalization sort across all matches before slicing page
      const allMatches = await Job.find(filter).lean();
      const sorted = sortJobs(allMatches, 'salary');
      pageJobs = sorted.slice((currentPage - 1) * normalizedLimit, currentPage * normalizedLimit);
    } else {
      const sortMap = {
        newest: { postedAt: -1, _id: 1 },
        oldest: { postedAt: 1, _id: 1 },
        title: { title: 1, _id: 1 },
      };
      pageJobs = await Job.find(filter)
        .sort(sortMap[cleanSort] || sortMap.newest)
        .skip((currentPage - 1) * normalizedLimit)
        .limit(normalizedLimit)
        .lean();
    }

    const normalizedJobs = pageJobs.map((job) => ({
      ...job,
      _id: String(job._id || jobIdentity(job)),
    }));

    const totalPages = Math.max(1, Math.ceil(totalMatching / normalizedLimit));
    const paginationObj = {
      page: currentPage,
      pageSize: normalizedLimit,
      limit: normalizedLimit,
      total: totalMatching,
      totalItems: totalMatching,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };

    const liveStatus = await ingestionManager.getLiveStatus();
    let dbCountsBySource = [];
    try {
      dbCountsBySource = await Job.aggregate([
        { $match: { isActive: true, postedAt: { $gte: cutoffDate, $lte: maxFutureDate } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]);
    } catch {
      // ignore
    }
    const dbMap = new Map();
    dbCountsBySource.forEach((item) => dbMap.set(item._id, item.count));

    const liveProviders = Object.entries(liveStatus).map(([name, s]) => {
      const realCount = dbMap.get(name) || s.ingestedTotal || 0;
      return {
        name,
        configured: s.configured,
        operational: s.operational,
        status: s.status,
        count: realCount,
        ingested: realCount,
        reportedTotal: s.reportedTotal || realCount,
        truncated: s.status === 'running',
        pagesRequested: s.pagesRequested,
        accessibleLimit: s.accessibleLimit,
        message: s.message,
      };
    });

    return res.status(200).json({
      success: true,
      jobs: normalizedJobs,
      pagination: paginationObj,
      providers: liveProviders,
      catalog: catalogMeta,
      data: {
        jobs: normalizedJobs,
        pagination: paginationObj,
        providers: liveProviders,
        catalog: catalogMeta,
      },
    });
  }

  // In-memory fallback (when MongoDB is offline):
  // 1. Fetch aggregated provider jobs
  const fallbackAggregated = await searchAggregatedJobs({
    keyword: cleanKeyword,
    location: cleanLocation,
    jobType: cleanJobType,
    source: cleanSource,
  });

  // 2. Filter the ENTIRE dataset by 30-day window, then by user search criteria
  const eligibleRecent = filterJobsByLast30Days(fallbackAggregated.jobs || []);
  const filtered = eligibleRecent.filter((job) =>
    matchesFilters(job, {
      cleanKeyword,
      cleanLocation,
      cleanJobType,
      cleanWorkMode,
      cleanExperienceLevel,
      skillFilters,
      cleanSource,
    })
  );

  // 3. Compute truthful total matching count
  const totalMatching = filtered.length;

  // 4. Sort across the entire filtered dataset
  const sorted = sortJobs(filtered, cleanSort);

  // 5. Apply pagination
  const pageJobs = sorted
    .slice((currentPage - 1) * normalizedLimit, currentPage * normalizedLimit)
    .map((job) => ({
      ...job,
      _id: job._id || jobIdentity(job),
    }));

  const totalPages = Math.max(1, Math.ceil(totalMatching / normalizedLimit));
  const paginationObj = {
    page: currentPage,
    pageSize: normalizedLimit,
    limit: normalizedLimit,
    total: totalMatching,
    totalItems: totalMatching,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };

  return res.status(200).json({
    success: true,
    jobs: pageJobs,
    pagination: paginationObj,
    providers: fallbackAggregated.providers || providerMetadata,
    catalog: {
      fetchedCount: fallbackAggregated.fetchedCount,
      uniqueCount: fallbackAggregated.uniqueCount,
      estimatedTotal: fallbackAggregated.estimatedTotal,
    },
    data: {
      jobs: pageJobs,
      pagination: paginationObj,
      providers: fallbackAggregated.providers || providerMetadata,
      catalog: {
        fetchedCount: fallbackAggregated.fetchedCount,
        uniqueCount: fallbackAggregated.uniqueCount,
        estimatedTotal: fallbackAggregated.estimatedTotal,
      },
    },
  });
});

export const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let job = null;

  if (isMongoConnected()) {
    if (mongoose.isValidObjectId(id)) {
      job = await Job.findById(id).lean();
    }
    if (!job && id.includes(':')) {
      const [source, ...rest] = id.split(':');
      const providerJobId = rest.join(':');
      job = await Job.findOne({ source, providerJobId }).lean();
    }
    if (!job) {
      job = await Job.findOne({
        $or: [{ sourceUrl: id }, { applyUrl: id }, { providerJobId: id }],
      }).lean();
    }
  }

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found',
    });
  }

  return res.status(200).json({
    success: true,
    job,
    data: { job },
  });
});

export const getIngestionStatus = asyncHandler(async (req, res) => {
  const status = await ingestionManager.getLiveStatus();
  return res.status(200).json({
    success: true,
    providers: status,
  });
});

