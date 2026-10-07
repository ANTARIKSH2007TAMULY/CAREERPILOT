import express from 'express';
import { analyzeJobMatchHandler, chatCoachHandler } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/job-match', protect, analyzeJobMatchHandler);
router.post('/chat', protect, chatCoachHandler);

export default router;
