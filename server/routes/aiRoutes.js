import express from 'express';
import {
  analyzeJobMatchHandler,
  chatCoachHandler,
  getUsageHandler,
  interviewPrepHandler,
  resumeAnalysisHandler,
  roadmapHandler,
} from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/usage', protect, getUsageHandler);
router.post('/job-match', protect, analyzeJobMatchHandler);
router.post('/chat', protect, chatCoachHandler);
router.post('/resume-analysis', protect, resumeAnalysisHandler);
router.post('/roadmap', protect, roadmapHandler);
router.post('/interview-prep', protect, interviewPrepHandler);

export default router;
