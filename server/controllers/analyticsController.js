import Application from '../models/Application.js';
import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';

const safePercent = (value, total) => {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
};

export const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const applications = await Application.find({ user: req.user._id }).populate('job').sort({ updatedAt: -1 });
  const savedJobsCount = await Job.countDocuments({ isActive: true });

  const summary = {
    totalApplications: applications.length,
    activeApplications: applications.filter((app) => ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER'].includes(app.status)).length,
    interviews: applications.filter((app) => app.status === 'INTERVIEW').length,
    offers: applications.filter((app) => app.status === 'OFFER').length,
    rejected: applications.filter((app) => app.status === 'REJECTED').length,
    responseRate: safePercent(
      applications.filter((app) => ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(app.status)).length,
      applications.length || 1
    ),
    savedJobs: savedJobsCount,
  };

  const statusBreakdown = [
    'SAVED',
    'APPLIED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'REJECTED',
    'WITHDRAWN',
  ].map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
  }));

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

  const interviewConversion = safePercent(
    applications.filter((app) => app.status === 'INTERVIEW').length,
    applications.filter((app) => ['APPLIED', 'ASSESSMENT', 'INTERVIEW'].includes(app.status)).length || 1
  );

  const offerConversion = safePercent(
    applications.filter((app) => app.status === 'OFFER').length,
    applications.filter((app) => ['INTERVIEW', 'OFFER'].includes(app.status)).length || 1
  );

  const rejectionRate = safePercent(
    applications.filter((app) => app.status === 'REJECTED').length,
    applications.length || 1
  );

  const recentApplications = applications.slice(0, 6).map((app) => ({
    _id: app._id,
    company: app.job?.company || 'Unknown',
    role: app.job?.title || 'Role',
    status: app.status,
    updatedAt: app.updatedAt,
  }));

  const upcomingDeadlines = applications
    .filter((app) => app.deadline)
    .slice(0, 5)
    .map((app) => ({
      _id: app._id,
      company: app.job?.company || 'Unknown',
      role: app.job?.title || 'Role',
      deadline: app.deadline,
      status: app.status,
    }));

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
        responseRate: summary.responseRate,
      },
      recentApplications,
      upcomingDeadlines,
    },
  });
});

export const getAnalyticsTrends = asyncHandler(async (req, res) => {
  const applications = await Application.find({ user: req.user._id }).populate('job').sort({ createdAt: 1 });
  const monthMap = new Map();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const label = date.toLocaleString('en-US', { month: 'short' });
    monthMap.set(label, 0);
  }

  applications.forEach((app) => {
    const createdAt = new Date(app.createdAt);
    const label = createdAt.toLocaleString('en-US', { month: 'short' });
    if (monthMap.has(label)) {
      monthMap.set(label, monthMap.get(label) + 1);
    }
  });

  const monthlyTrend = Array.from(monthMap.entries()).map(([month, count]) => ({
    month,
    applications: count,
  }));

  return res.status(200).json({
    success: true,
    data: {
      monthlyTrend,
    },
  });
});
