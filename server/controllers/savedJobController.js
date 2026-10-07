import SavedJob from '../models/SavedJob.js';
import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSavedJobs = asyncHandler(async (req, res) => {
  const savedJobs = await SavedJob.find({ user: req.user._id }).populate('job').sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: {
      jobs: savedJobs.map((entry) => entry.job),
    },
  });
});

export const saveJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found',
    });
  }

  const existing = await SavedJob.findOne({ user: req.user._id, job: jobId });

  if (existing) {
    return res.status(200).json({
      success: true,
      data: {
        saved: true,
        message: 'Job already saved',
      },
    });
  }

  const saved = await SavedJob.create({
    user: req.user._id,
    job: jobId,
  });

  return res.status(201).json({
    success: true,
    data: {
      saved,
    },
  });
});

export const removeSavedJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const deleted = await SavedJob.findOneAndDelete({ user: req.user._id, job: jobId });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Saved job not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: {},
  });
});
