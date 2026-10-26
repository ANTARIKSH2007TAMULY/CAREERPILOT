import Application from '../models/Application.js';
import SavedJob from '../models/SavedJob.js';
import Interview from '../models/Interview.js';
import { isMongoConnected } from '../config/db.js';
import { findDemoApplicationsByUser, findDemoApplicationById } from '../config/demoApplications.js';
import { findDemoSavedJobsByUser } from '../config/demoSavedJobs.js';
import { findDemoInterviewsByUser } from '../config/demoInterviews.js';
import asyncHandler from '../utils/asyncHandler.js';

const safePercent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
};

export const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let applications = [];
  let savedJobsCount = 0;
  let upcomingInterviewsList = [];

  if (isMongoConnected()) {
    applications = await Application.find({ user: userId })
      .populate('job')
      .sort({ updatedAt: -1 });

    savedJobsCount = await SavedJob.countDocuments({ user: userId });

    upcomingInterviewsList = await Interview.find({
      user: userId,
      status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
      startTime: { $gte: new Date() },
    })
      .populate('application', 'jobTitle company location status')
      .sort({ startTime: 1 })
      .limit(6);
  } else {
    applications = findDemoApplicationsByUser(userId);
    savedJobsCount = findDemoSavedJobsByUser(userId).length;

    const demoIv = findDemoInterviewsByUser(userId, { upcomingOnly: true });
    upcomingInterviewsList = demoIv.slice(0, 6).map((iv) => {
      const app = findDemoApplicationById(iv.application, userId);
      return {
        ...iv,
        application: app
          ? {
              _id: app._id,
              jobTitle: app.jobTitle || app.job?.title || 'Role',
              company: app.company || app.job?.company || 'Company',
              location: app.location || '',
              status: app.status,
            }
          : null,
      };
    });
  }

  const totalApplications = applications.length;
  const submittedApplications = applications.filter((app) =>
    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(app.status)
  ).length;

  const activeApplications = applications.filter((app) =>
    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER'].includes(app.status)
  ).length;

  const interviews = applications.filter((app) =>
    ['INTERVIEW', 'ASSESSMENT'].includes(app.status)
  ).length;

  const offers = applications.filter((app) =>
    ['OFFER', 'ACCEPTED'].includes(app.status)
  ).length;

  const accepted = applications.filter((app) => app.status === 'ACCEPTED').length;
  const rejected = applications.filter((app) => app.status === 'REJECTED').length;
  const withdrawn = applications.filter((app) => app.status === 'WITHDRAWN').length;
  const interested = applications.filter((app) =>
    app.status === 'INTERESTED' || app.status === 'SAVED'
  ).length;

  // Response rate: proportion of submitted applications that received any company response
  const respondedApplications = applications.filter((app) =>
    ['ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED'].includes(app.status)
  ).length;
  const responseRate = safePercent(respondedApplications, submittedApplications);

  // Conversion rates (safely guarded against 0 denominators)
  const interviewConversion = safePercent(interviews, submittedApplications);
  const offerConversion = safePercent(offers, interviews);
  const rejectionRate = safePercent(rejected, submittedApplications);

  const summary = {
    totalApplications,
    submittedApplications,
    activeApplications,
    interviews,
    offers,
    accepted,
    rejected,
    withdrawn,
    interested,
    responseRate,
    savedJobs: savedJobsCount,
  };

  const statusCategories = [
    'INTERESTED',
    'APPLIED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
  ];

  const statusBreakdown = statusCategories.map((status) => {
    let count = 0;
    if (status === 'INTERESTED') {
      count = applications.filter((app) => app.status === 'INTERESTED' || app.status === 'SAVED').length;
    } else {
      count = applications.filter((app) => app.status === status).length;
    }
    return { status, count };
  });

  const jobTypeBreakdown = Array.from(
    new Set(applications.map((app) => app.job?.jobType).filter(Boolean))
  ).map((jobType) => ({
    name: jobType,
    count: applications.filter((app) => app.job?.jobType === jobType).length,
  }));

  const workModeBreakdown = Array.from(
    new Set(applications.map((app) => app.job?.workMode).filter(Boolean))
  ).map((workMode) => ({
    name: workMode,
    count: applications.filter((app) => app.job?.workMode === workMode).length,
  }));

  const recentApplications = applications.slice(0, 6).map((app) => ({
    _id: app._id,
    company: app.company || app.job?.company || 'Unknown Company',
    role: app.jobTitle || app.job?.title || 'Role',
    status: app.status === 'SAVED' ? 'INTERESTED' : app.status,
    appliedAt: app.appliedAt,
    updatedAt: app.updatedAt,
  }));

  const upcomingDeadlines = [
    ...applications
      .filter((app) => app.deadline)
      .map((app) => ({
        _id: `deadline-${app._id}`,
        applicationId: app._id,
        company: app.company || app.job?.company || 'Unknown Company',
        role: app.jobTitle || app.job?.title || 'Role',
        deadline: app.deadline,
        type: 'deadline',
        label: 'Deadline',
        status: app.status === 'SAVED' ? 'INTERESTED' : app.status,
      })),
    ...upcomingInterviewsList.map((iv) => ({
      _id: `interview-${iv._id}`,
      applicationId: iv.application?._id || iv.application,
      company: iv.application?.company || iv.company || 'Company',
      role: iv.application?.jobTitle || iv.title || 'Interview',
      deadline: iv.startTime,
      type: 'interview',
      label: iv.type || 'Interview',
      status: 'INTERVIEW',
    })),
  ]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);

  return res.status(200).json({
    success: true,
    data: {
      summary,
      statusBreakdown,
      jobTypeBreakdown,
      workModeBreakdown,
      metrics: {
        interviewConversion,
        offerConversion,
        rejectionRate,
        responseRate,
      },
      recentApplications,
      upcomingDeadlines,
      upcomingInterviews: upcomingInterviewsList,
    },
  });
});

export const getAnalyticsTrends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const range = String(req.query.range || '6m').toLowerCase();

  let applications = [];
  if (isMongoConnected()) {
    applications = await Application.find({ user: userId })
      .select('appliedAt createdAt status')
      .lean();
  } else {
    applications = findDemoApplicationsByUser(userId);
  }

  const getAppTimestamp = (app) => {
    if (app.appliedAt) {
      const t = new Date(app.appliedAt).getTime();
      if (!Number.isNaN(t)) return t;
    }
    if (app.createdAt) {
      const t = new Date(app.createdAt).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return 0;
  };

  const trendBuckets = [];
  const now = new Date();

  if (range === '7d') {
    // 7 daily buckets, ending today
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      const name = start.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      const isoDate = start.toISOString().slice(0, 10);

      const count = applications.filter((app) => {
        const time = getAppTimestamp(app);
        return time >= start.getTime() && time <= end.getTime();
      }).length;

      trendBuckets.push({
        name,
        month: name,
        date: isoDate,
        applications: count,
      });
    }
  } else if (range === '30d') {
    // 30 daily buckets
    for (let i = 29; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      const name = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isoDate = start.toISOString().slice(0, 10);

      const count = applications.filter((app) => {
        const time = getAppTimestamp(app);
        return time >= start.getTime() && time <= end.getTime();
      }).length;

      trendBuckets.push({
        name,
        month: name,
        date: isoDate,
        applications: count,
      });
    }
  } else if (range === '90d') {
    // 12 weekly buckets
    for (let i = 11; i >= 0; i -= 1) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const name = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const count = applications.filter((app) => {
        const time = getAppTimestamp(app);
        return time >= start.getTime() && time < end.getTime();
      }).length;

      trendBuckets.push({
        name: `Week of ${name}`,
        month: name,
        applications: count,
      });
    }
  } else {
    // '6m' (default): 6 monthly buckets
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const name = start.toLocaleString('en-US', { month: 'short' });

      const count = applications.filter((app) => {
        const time = getAppTimestamp(app);
        return time >= start.getTime() && time <= end.getTime();
      }).length;

      trendBuckets.push({
        name,
        month: name,
        applications: count,
      });
    }
  }

  const totalInRange = trendBuckets.reduce((sum, b) => sum + b.applications, 0);

  return res.status(200).json({
    success: true,
    data: {
      range,
      trend: trendBuckets,
      monthlyTrend: trendBuckets,
      totalInRange,
    },
  });
});
