import mongoose from 'mongoose';
import SavedJob from '../models/SavedJob.js';
import Job from '../models/Job.js';
import { isMongoConnected } from '../config/db.js';
import {
  createDemoSavedJob,
  deleteDemoSavedJob,
  findDemoSavedJobsByUser,
} from '../config/demoSavedJobs.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSavedJobs = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isMongoConnected()) {
    const demoEntries = findDemoSavedJobsByUser(userId);
    const jobs = demoEntries.map((e) => {
      const j = e.job || {};
      return {
        ...j,
        _id: String(j._id || e.jobId || e._id),
        savedJobId: String(e._id),
        savedAt: e.createdAt,
      };
    });
    return res.status(200).json({
      success: true,
      jobs,
      data: { jobs },
    });
  }

  const savedList = await SavedJob.find({ user: userId })
    .populate('job')
    .sort({ createdAt: -1 })
    .lean();

  const jobs = savedList.map((entry) => {
    if (entry.job) {
      return {
        ...entry.job,
        _id: String(entry.job._id),
        savedJobId: String(entry._id),
        savedAt: entry.createdAt,
      };
    }

    // Preserve snapshot for unavailable or expired external job listings
    return {
      ...(entry.jobSnapshot || {}),
      _id: String(entry._id),
      savedJobId: String(entry._id),
      savedAt: entry.createdAt,
      isArchived: true,
    };
  });

  return res.status(200).json({
    success: true,
    jobs,
    data: { jobs },
  });
});

export const saveJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user._id;
  const jobPayload = req.body.job || req.body || {};

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job ID is required',
    });
  }

  const decodedJobId = decodeURIComponent(String(jobId)).trim();

  if (!isMongoConnected()) {
    const jobObj = typeof jobPayload === 'object' && (jobPayload.title || jobPayload.company)
      ? { ...jobPayload, _id: decodedJobId }
      : { _id: decodedJobId };
    const { entry, alreadySaved } = createDemoSavedJob(userId, jobObj);

    return res.status(alreadySaved ? 200 : 201).json({
      success: true,
      data: {
        saved: entry,
        message: alreadySaved ? 'Job already saved' : 'Job saved successfully',
      },
    });
  }

  // Resolve Job record in MongoDB
  let job = null;
  if (mongoose.isValidObjectId(decodedJobId)) {
    job = await Job.findById(decodedJobId);
  }

  if (!job) {
    job = await Job.findOne({
      $or: [
        { providerJobId: decodedJobId },
        { sourceUrl: decodedJobId },
        { applyUrl: decodedJobId },
      ],
    });
  }

  // Also check identifiers inside jobPayload if provided
  if (!job && jobPayload) {
    if (jobPayload._id && mongoose.isValidObjectId(jobPayload._id)) {
      job = await Job.findById(jobPayload._id);
    }
    if (!job && jobPayload.providerJobId) {
      job = await Job.findOne({ providerJobId: String(jobPayload.providerJobId).trim() });
    }
    if (!job && (jobPayload.sourceUrl || jobPayload.applyUrl)) {
      job = await Job.findOne({
        $or: [
          { sourceUrl: jobPayload.sourceUrl || jobPayload.applyUrl },
          { applyUrl: jobPayload.applyUrl || jobPayload.sourceUrl },
        ],
      });
    }
  }

  // If still not found in DB but job data passed in body, create or upsert the Job record
  if (!job && jobPayload?.title && jobPayload?.company) {
    try {
      job = await Job.create({
        title: String(jobPayload.title).trim(),
        company: String(jobPayload.company).trim(),
        companyLogo: jobPayload.companyLogo || '',
        location: jobPayload.location || '',
        salary: jobPayload.salary || '',
        description: jobPayload.description || jobPayload.title || '',
        applyUrl: jobPayload.applyUrl || jobPayload.sourceUrl || `https://example.com/job/${decodedJobId}`,
        sourceUrl: jobPayload.sourceUrl || jobPayload.applyUrl || '',
        source: jobPayload.source || 'External',
        providerJobId: jobPayload.providerJobId || decodedJobId,
        skills: Array.isArray(jobPayload.skills) ? jobPayload.skills : [],
        jobType: jobPayload.jobType || 'Full-time',
        workMode: jobPayload.workMode || 'Unspecified',
      });
    } catch {
      // If concurrent insert happens, find it again
      job = await Job.findOne({
        $or: [
          { providerJobId: decodedJobId },
          { sourceUrl: jobPayload.sourceUrl || jobPayload.applyUrl },
        ],
      });
    }
  }

  const snapshot = {
    title: job?.title || jobPayload?.title || 'Unknown Title',
    company: job?.company || jobPayload?.company || 'Unknown Company',
    companyLogo: job?.companyLogo || jobPayload?.companyLogo || '',
    location: job?.location || jobPayload?.location || '',
    workMode: job?.workMode || jobPayload?.workMode || 'Unspecified',
    salary: job?.salary || jobPayload?.salary || '',
    description: job?.description || jobPayload?.description || '',
    skills: Array.isArray(job?.skills)
      ? job.skills
      : Array.isArray(jobPayload?.skills)
      ? jobPayload.skills
      : [],
    applyUrl: job?.applyUrl || jobPayload?.applyUrl || '',
    sourceUrl: job?.sourceUrl || jobPayload?.sourceUrl || '',
    source: job?.source || jobPayload?.source || 'External',
    providerJobId: job?.providerJobId || jobPayload?.providerJobId || decodedJobId,
    postedAt: job?.postedAt || jobPayload?.postedAt || null,
  };

  // If a Job document exists, check unique constraint by job ObjectId
  if (job) {
    const existing = await SavedJob.findOne({ user: userId, job: job._id });
    if (existing) {
      return res.status(200).json({
        success: true,
        data: {
          saved: true,
          message: 'Job already saved',
          job,
        },
      });
    }

    const saved = await SavedJob.create({
      user: userId,
      job: job._id,
      jobSnapshot: snapshot,
    });

    return res.status(201).json({
      success: true,
      data: {
        saved,
        job,
        message: 'Job saved successfully',
      },
    });
  }

  // If Job could not be resolved or created
  if (!snapshot.title || snapshot.title === 'Unknown Title') {
    return res.status(404).json({
      success: false,
      message: 'Job not found',
    });
  }

  // Create SavedJob with snapshot
  const existingSnapshot = await SavedJob.findOne({
    user: userId,
    $or: [
      { 'jobSnapshot.providerJobId': decodedJobId },
      { 'jobSnapshot.sourceUrl': snapshot.sourceUrl },
      { 'jobSnapshot.applyUrl': snapshot.applyUrl },
    ],
  });

  if (existingSnapshot) {
    return res.status(200).json({
      success: true,
      data: {
        saved: true,
        message: 'Job already saved',
      },
    });
  }

  const saved = await SavedJob.create({
    user: userId,
    job: null,
    jobSnapshot: snapshot,
  });

  return res.status(201).json({
    success: true,
    data: {
      saved,
      message: 'Job saved successfully',
    },
  });
});

export const removeSavedJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user._id;

  const decodedJobId = decodeURIComponent(String(jobId)).trim();

  if (!isMongoConnected()) {
    const deleted = deleteDemoSavedJob(userId, decodedJobId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: {},
      message: 'Role removed from saved list',
    });
  }

  let deleted = null;

  // 1. Try deleting where job is the ObjectId and user matches
  if (mongoose.isValidObjectId(decodedJobId)) {
    deleted = await SavedJob.findOneAndDelete({ user: userId, job: decodedJobId });

    // 2. Or where _id is the SavedJob entry ID
    if (!deleted) {
      deleted = await SavedJob.findOneAndDelete({ user: userId, _id: decodedJobId });
    }
  }

  // 3. Try resolving Job by providerJobId or URLs
  if (!deleted) {
    const matchingJob = await Job.findOne({
      $or: [
        { providerJobId: decodedJobId },
        { sourceUrl: decodedJobId },
        { applyUrl: decodedJobId },
      ],
    });
    if (matchingJob) {
      deleted = await SavedJob.findOneAndDelete({ user: userId, job: matchingJob._id });
    }
  }

  // 4. Try matching jobSnapshot identifiers
  if (!deleted) {
    deleted = await SavedJob.findOneAndDelete({
      user: userId,
      $or: [
        { 'jobSnapshot.providerJobId': decodedJobId },
        { 'jobSnapshot.sourceUrl': decodedJobId },
        { 'jobSnapshot.applyUrl': decodedJobId },
      ],
    });
  }

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Saved job not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: {},
    message: 'Role removed from saved list',
  });
});
