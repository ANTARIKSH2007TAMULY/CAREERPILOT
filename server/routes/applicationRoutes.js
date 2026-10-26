import express from 'express';
import {
  createApplication,
  deleteApplication,
  getApplicationById,
  getApplications,
  updateApplication,
} from '../controllers/applicationController.js';
import {
  createInterview,
  getInterviewsByApplication,
} from '../controllers/interviewController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getApplications);
router.post('/', protect, createApplication);
router.get('/:id', protect, getApplicationById);
router.patch('/:id', protect, updateApplication);
router.delete('/:id', protect, deleteApplication);

// Nested interview routes
router.post('/:applicationId/interviews', protect, createInterview);
router.get('/:applicationId/interviews', protect, getInterviewsByApplication);

export default router;
