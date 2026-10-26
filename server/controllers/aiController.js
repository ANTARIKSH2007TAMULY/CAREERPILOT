import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { isMongoConnected } from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  reserveQuota,
  reconcileUsage,
  releaseReservation,
  getUserUsageSummary,
  QuotaExceededError,
  DatabaseUnavailableError,
} from '../services/ai/aiQuotaService.js';
import {
  analyzeJobMatch,
  analyzeResume,
  getCareerRoadmap,
  getCoachAdvice,
  getInterviewPrep,
} from '../services/ai/aiService.js';

const loadJob = async ({ jobId, job }) => {
  // If complete job object passed in body, use it directly
  if (job && typeof job === 'object' && (job.title || job.company)) {
    return job;
  }

  if (jobId && isMongoConnected()) {
    if (mongoose.isValidObjectId(jobId)) {
      const found = await Job.findById(jobId).lean();
      if (found) return found;
    }

    const foundByProvider = await Job.findOne({
      $or: [{ providerJobId: jobId }, { sourceUrl: jobId }],
    }).lean();
    if (foundByProvider) return foundByProvider;
  }

  return job || null;
};

const handleQuotaOrDbError = (res, error) => {
  if (error instanceof QuotaExceededError) {
    return res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
        resetsAt: error.resetsAt,
        limit: error.limit,
        current: error.current,
      },
    });
  }

  if (error instanceof DatabaseUnavailableError || error.code === 'DATABASE_UNAVAILABLE_AI_FAIL_CLOSED') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE_AI_FAIL_CLOSED',
        message: 'AI features are temporarily unavailable because persistent quota verification is offline. Please try again when the database connection is restored.',
      },
    });
  }

  if (error.code === 'AI_INPUT_TOO_LARGE') {
    return res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  throw error;
};

const executeWithQuotaLifecycle = async ({ user, feature, inputText, executeFn, res }) => {
  let reservation = null;
  try {
    reservation = await reserveQuota({ user, feature, inputText });
  } catch (error) {
    return handleQuotaOrDbError(res, error);
  }

  try {
    const result = await executeFn();

    if (reservation?.reservationId) {
      if (result && result.meta) {
        await reconcileUsage(reservation.reservationId, {
          inputTokens: result.meta.inputTokens,
          outputTokens: result.meta.outputTokens,
          totalTokens: result.meta.totalTokens,
          durationMs: result.meta.durationMs,
          model: result.meta.model,
          keyUsed: result.meta.keyUsed,
        });
      } else if (result && result.generatedByAI === false) {
        // Heuristic fallback: reconcile with 0 tokens so quota isn't consumed for local templates
        await reconcileUsage(reservation.reservationId, {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          durationMs: 0,
          model: 'heuristic',
          keyUsed: 'none',
        });
      } else {
        await reconcileUsage(reservation.reservationId, {});
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (reservation?.reservationId) {
      await releaseReservation(reservation.reservationId, 'failed');
    }
    throw error;
  }
};

export const analyzeJobMatchHandler = asyncHandler(async (req, res) => {
  const selectedJob = await loadJob(req.body);

  if (!selectedJob) {
    return res.status(400).json({
      success: false,
      message: 'A valid job is required for AI analysis',
    });
  }

  const inputText = `${selectedJob.title || ''} ${selectedJob.company || ''} ${selectedJob.description || ''} ${(selectedJob.skills || []).join(' ')}`;

  return executeWithQuotaLifecycle({
    user: req.user,
    feature: 'job-match',
    inputText,
    res,
    executeFn: async () => {
      return analyzeJobMatch({
        user: req.user,
        job: selectedJob,
      });
    },
  });
});

export const chatCoachHandler = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A question is required',
    });
  }

  const inputText = `${message} ${Array.isArray(history) ? JSON.stringify(history) : ''}`;

  return executeWithQuotaLifecycle({
    user: req.user,
    feature: 'coach',
    inputText,
    res,
    executeFn: async () => {
      const advice = await getCoachAdvice({
        user: req.user,
        message,
        history: Array.isArray(history) ? history : [],
      });
      const answer = typeof advice === 'string' ? advice : advice.answer;
      return {
        answer,
        ...((typeof advice === 'object' && advice) || {}),
      };
    },
  });
});

export const resumeAnalysisHandler = asyncHandler(async (req, res) => {
  const inputText = `${(req.user?.skills || []).join(' ')} ${JSON.stringify(req.user?.experience || [])} ${String(req.user?.resume || '')}`;

  return executeWithQuotaLifecycle({
    user: req.user,
    feature: 'resume-analysis',
    inputText,
    res,
    executeFn: async () => {
      return analyzeResume({ user: req.user });
    },
  });
});

export const roadmapHandler = asyncHandler(async (req, res) => {
  const goal = req.body?.goal || '';
  const inputText = `${goal} ${(req.user?.skills || []).join(' ')}`;

  return executeWithQuotaLifecycle({
    user: req.user,
    feature: 'roadmap',
    inputText,
    res,
    executeFn: async () => {
      return getCareerRoadmap({ user: req.user, goal });
    },
  });
});

export const interviewPrepHandler = asyncHandler(async (req, res) => {
  const job = await loadJob(req.body);
  const answer = req.body?.answer || '';
  const inputText = `${job?.title || ''} ${answer} ${(req.user?.skills || []).join(' ')}`;

  return executeWithQuotaLifecycle({
    user: req.user,
    feature: 'interview-preparation',
    inputText,
    res,
    executeFn: async () => {
      return getInterviewPrep({
        user: req.user,
        job,
        answer,
      });
    },
  });
});

export const getUsageHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const summary = await getUserUsageSummary(req.user._id);
  return res.status(200).json({
    success: true,
    data: summary,
  });
});
