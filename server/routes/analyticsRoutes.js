import express from 'express';
import { getAnalyticsSummary, getAnalyticsTrends } from '../controllers/analyticsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, getAnalyticsSummary);
router.get('/trends', protect, getAnalyticsTrends);

export default router;
