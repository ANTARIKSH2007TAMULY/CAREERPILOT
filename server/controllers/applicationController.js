import Application from '../models/Application.js';
import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ user: req.user._id })
    .populate('job')
    .sort({ updatedAt: -1 });

  return res.status(200).json({
    success: true,
    data: {
      applications,
    },
  });
});

export const createApplication = asyncHandler(async (req, res) => {
  const { jobId, status, notes, nextAction, recruiter, interviewDate, deadline } = req.body;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job id is required',
    });
  }

  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found',
    });
  }

  const existingApplication = await Application.findOne({ user: req.user._id, job: jobId });

  if (existingApplication) {
    return res.status(200).json({
      success: true,
      data: {
        application: existingApplication,
      },
    });
  }

  const application = await Application.create({
    user: req.user._id,
    job: jobId,
    status: status || 'SAVED',
    notes: notes || '',
    nextAction: nextAction || '',
    recruiter: recruiter || '',
    interviewDate: interviewDate || null,
    deadline: deadline || job.deadline || null,
    appliedAt: new Date(),
  });

  return res.status(201).json({
    success: true,
    data: {
      application,
    },
  });
});

export const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedUpdates = [
    'status',
    'notes',
    'nextAction',
    'interviewDate',
    'recruiter',
    'documents',
    'deadline',
  ];

  const updates = {};

  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const application = await Application.findOne({ _id: id, user: req.user._id });

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  Object.assign(application, updates);

  if (updates.status === 'APPLIED' && !application.appliedAt) {
    application.appliedAt = new Date();
  }

  await application.save();

  return res.status(200).json({
    success: true,
    data: {
      application,
    },
  });
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Application.findOneAndDelete({ _id: id, user: req.user._id });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: {},
  });
});
