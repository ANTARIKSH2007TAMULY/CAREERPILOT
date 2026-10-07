import express from 'express';
import { getSavedJobs, removeSavedJob, saveJob } from '../controllers/savedJobController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSavedJobs);
router.post('/:jobId', protect, saveJob);
router.delete('/:jobId', protect, removeSavedJob);

export default router;
