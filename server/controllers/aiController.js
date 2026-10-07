import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';
import { analyzeJobMatch, getCoachAdvice } from '../services/ai/aiService.js';

export const analyzeJobMatchHandler = asyncHandler(async (req, res) => {
  const { jobId, job } = req.body;

  let selectedJob = null;

  if (jobId) {
    selectedJob = await Job.findById(jobId);
  } else if (job) {
    selectedJob = job;
  }

  if (!selectedJob) {
    return res.status(400).json({
      success: false,
      message: 'A valid job is required for AI analysis',
    });
  }

  const analysis = await analyzeJobMatch({
    user: req.user,
    job: selectedJob,
  });

  return res.status(200).json({
    success: true,
    data: analysis,
  });
});

export const chatCoachHandler = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A question is required',
    });
  }

  const advice = await getCoachAdvice({
    user: req.user,
    message,
  });

  return res.status(200).json({
    success: true,
    data: {
      answer: advice,
    },
  });
});
