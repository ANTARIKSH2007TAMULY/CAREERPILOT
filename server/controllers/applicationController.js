import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { isMongoConnected } from '../config/db.js';
import {
  createDemoApplication,
  deleteDemoApplication,
  findDemoApplicationById,
  findDemoApplicationByJobOrIdentity,
  findDemoApplicationsByUser,
  updateDemoApplication,
} from '../config/demoApplications.js';
import asyncHandler from '../utils/asyncHandler.js';

const ALLOWED_STATUSES = [
  'SAVED',
  'INTERESTED',
  'APPLIED',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
];

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getApplications = asyncHandler(async (req, res) => {
  const { status, search, sort = 'recent', page, limit } = req.query;
  const userId = req.user._id;

  if (!isMongoConnected()) {
    let applications = findDemoApplicationsByUser(userId, { status, search, sort });
    const total = applications.length;

    let paginationObj = null;
    if (page || limit) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 20);
      const totalPages = Math.max(1, Math.ceil(total / l));
      applications = applications.slice((p - 1) * l, p * l);
      paginationObj = {
        page: p,
        limit: l,
        total,
        totalPages,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: paginationObj,
      },
    });
  }

  // MongoDB path
  const filter = { user: userId };

  if (status) {
    const s = String(status).toUpperCase();
    if (s === 'INTERESTED') {
      filter.status = { $in: ['INTERESTED', 'SAVED'] };
    } else {
      filter.status = s;
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { jobTitle: regex },
      { company: regex },
      { location: regex },
    ];
  }

  let sortCriteria = { updatedAt: -1 };
  if (sort === 'appliedAt') {
    sortCriteria = { appliedAt: -1, updatedAt: -1 };
  } else if (sort === 'company') {
    sortCriteria = { company: 1, jobTitle: 1 };
  } else if (sort === 'title') {
    sortCriteria = { jobTitle: 1, company: 1 };
  } else if (sort === 'oldest') {
    sortCriteria = { createdAt: 1 };
  }

  let query = Application.find(filter)
    .populate('job')
    .populate({
      path: 'interviews',
      match: { status: { $ne: 'CANCELLED' } },
      options: { sort: { startTime: 1 } },
    })
    .sort(sortCriteria);

  let paginationObj = null;
  if (page || limit) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const total = await Application.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / l));

    query = query.skip((p - 1) * l).limit(l);
    paginationObj = {
      page: p,
      limit: l,
      total,
      totalPages,
    };
  }

  const applications = await query.exec();

  return res.status(200).json({
    success: true,
    data: {
      applications,
      pagination: paginationObj,
    },
  });
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  if (!isMongoConnected()) {
    const app = findDemoApplicationById(id, userId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    return res.status(200).json({ success: true, data: { application: app } });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  const application = await Application.findOne({ _id: id, user: userId })
    .populate('job')
    .populate({
      path: 'interviews',
      options: { sort: { startTime: 1 } },
    });
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  return res.status(200).json({
    success: true,
    data: { application },
  });
});

export const createApplication = asyncHandler(async (req, res) => {
  const {
    jobId,
    status = 'INTERESTED',
    notes = '',
    nextAction = '',
    recruiter = '',
    interviewDate = null,
    deadline = null,
    appliedAt = null,
    offerSalary = '',
    offerDeadline = null,
    jobTitle = '',
    company = '',
    companyLogo = '',
    location = '',
    salary = '',
    applyUrl = '',
    providerJobId = '',
    source = '',
  } = req.body;

  const userId = req.user._id;
  const normalizedStatus = String(status).toUpperCase();

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Allowed: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  // Handle offline demo store
  if (!isMongoConnected()) {
    const existing = findDemoApplicationByJobOrIdentity(userId, {
      jobId,
      providerJobId,
      applyUrl,
      jobTitle,
      company,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Application already tracked for this role',
        data: { application: existing },
      });
    }

    const application = createDemoApplication({
      user: userId,
      job: jobId ? { _id: jobId, title: jobTitle, company } : null,
      jobTitle,
      company,
      companyLogo,
      location,
      salary,
      applyUrl,
      providerJobId,
      source,
      status: normalizedStatus,
      appliedAt,
      deadline,
      interviewDate,
      offerSalary,
      offerDeadline,
      notes,
      nextAction,
      recruiter,
    });

    return res.status(201).json({
      success: true,
      data: { application },
    });
  }

  // Connected to MongoDB: resolve job if jobId is valid ObjectId
  let resolvedJob = null;
  let resolvedJobId = null;

  if (jobId) {
    if (mongoose.isValidObjectId(jobId)) {
      resolvedJob = await Job.findById(jobId);
      if (resolvedJob) {
        resolvedJobId = resolvedJob._id;
      }
    } else {
      // Could be providerId or source:providerJobId
      resolvedJob = await Job.findOne({
        $or: [{ providerJobId: jobId }, { sourceUrl: jobId }],
      });
      if (resolvedJob) {
        resolvedJobId = resolvedJob._id;
      }
    }
  }

  // Check for duplicate application for this user
  const duplicateConditions = [];
  if (resolvedJobId) {
    duplicateConditions.push({ job: resolvedJobId });
  }
  if (providerJobId) {
    duplicateConditions.push({ providerJobId });
  }
  if (applyUrl) {
    duplicateConditions.push({ applyUrl });
  }
  if (jobTitle && company) {
    duplicateConditions.push({
      jobTitle: new RegExp(`^${escapeRegex(jobTitle.trim())}$`, 'i'),
      company: new RegExp(`^${escapeRegex(company.trim())}$`, 'i'),
    });
  }

  if (duplicateConditions.length > 0) {
    const existing = await Application.findOne({
      user: userId,
      $or: duplicateConditions,
    }).populate('job');

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Application already tracked for this role',
        data: { application: existing },
      });
    }
  }

  // Snapshot values take precedence, fallback to resolved Job document
  const finalTitle = jobTitle || resolvedJob?.title || 'Unknown Role';
  const finalCompany = company || resolvedJob?.company || 'Unknown Company';
  const finalLogo = companyLogo || resolvedJob?.companyLogo || '';
  const finalLocation = location || resolvedJob?.location || '';
  const finalSalary = salary || resolvedJob?.salary || '';
  const finalApplyUrl = applyUrl || resolvedJob?.applyUrl || resolvedJob?.sourceUrl || '';
  const finalProviderId = providerJobId || resolvedJob?.providerJobId || (jobId && !mongoose.isValidObjectId(jobId) ? String(jobId) : '');
  const finalSource = source || resolvedJob?.source || '';
  const finalDeadline = deadline || resolvedJob?.deadline || null;

  // Determine appliedAt date
  let computedAppliedAt = null;
  if (normalizedStatus === 'APPLIED') {
    computedAppliedAt = appliedAt ? new Date(appliedAt) : new Date();
  } else if (appliedAt) {
    computedAppliedAt = new Date(appliedAt);
  }

  const application = await Application.create({
    user: userId,
    job: resolvedJobId,
    jobTitle: finalTitle,
    company: finalCompany,
    companyLogo: finalLogo,
    location: finalLocation,
    salary: finalSalary,
    applyUrl: finalApplyUrl,
    providerJobId: finalProviderId,
    source: finalSource,
    status: normalizedStatus,
    appliedAt: computedAppliedAt,
    deadline: finalDeadline,
    interviewDate: interviewDate ? new Date(interviewDate) : null,
    offerSalary: offerSalary || '',
    offerDeadline: offerDeadline ? new Date(offerDeadline) : null,
    notes: notes || '',
    nextAction: nextAction || '',
    recruiter: recruiter || '',
    statusHistory: [
      {
        status: normalizedStatus,
        changedAt: new Date(),
        notes: notes || 'Application created',
      },
    ],
  });

  return res.status(201).json({
    success: true,
    data: { application },
  });
});

export const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const allowedUpdates = [
    'status',
    'notes',
    'nextAction',
    'interviewDate',
    'deadline',
    'offerSalary',
    'offerDeadline',
    'recruiter',
    'documents',
    'appliedAt',
    'jobTitle',
    'company',
    'salary',
    'location',
    'applyUrl',
  ];

  const updates = {};
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (updates.status) {
    updates.status = String(updates.status).toUpperCase();
    if (!ALLOWED_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${updates.status}". Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }
  }

  if (!isMongoConnected()) {
    const updated = updateDemoApplication(id, userId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    return res.status(200).json({ success: true, data: { application: updated } });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  const application = await Application.findOne({ _id: id, user: userId });
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  // Handle status transition and history
  if (updates.status && updates.status !== application.status) {
    application.statusHistory = application.statusHistory || [];
    application.statusHistory.push({
      status: updates.status,
      changedAt: new Date(),
      notes: updates.notes || `Status changed to ${updates.status}`,
    });

    if (updates.status === 'APPLIED' && !application.appliedAt && !updates.appliedAt) {
      application.appliedAt = new Date();
    }
  }

  Object.assign(application, updates);

  // Parse date fields safely
  if (updates.appliedAt !== undefined) {
    application.appliedAt = updates.appliedAt ? new Date(updates.appliedAt) : null;
  }
  if (updates.interviewDate !== undefined) {
    application.interviewDate = updates.interviewDate ? new Date(updates.interviewDate) : null;
  }
  if (updates.deadline !== undefined) {
    application.deadline = updates.deadline ? new Date(updates.deadline) : null;
  }
  if (updates.offerDeadline !== undefined) {
    application.offerDeadline = updates.offerDeadline ? new Date(updates.offerDeadline) : null;
  }

  await application.save();

  return res.status(200).json({
    success: true,
    data: { application },
  });
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  if (!isMongoConnected()) {
    const deleted = deleteDemoApplication(id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    return res.status(200).json({ success: true, data: {} });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  const deleted = await Application.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  return res.status(200).json({
    success: true,
    data: {},
  });
});
