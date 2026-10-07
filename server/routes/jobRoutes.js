import express from 'express';
import { getJobById, getJobs } from '../controllers/jobController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getJobs);
router.get('/:id', protect, getJobById);

export default router;
