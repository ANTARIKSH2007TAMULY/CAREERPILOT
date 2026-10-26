import express from 'express';
import { getIngestionStatus, getJobById, getJobs } from '../controllers/jobController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getJobs);
router.get('/ingestion-status', getIngestionStatus);
router.get('/:id', getJobById);

export default router;
