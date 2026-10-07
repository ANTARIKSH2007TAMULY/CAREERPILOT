import express from 'express';
import { createApplication, deleteApplication, getApplications, updateApplication } from '../controllers/applicationController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getApplications);
router.post('/', protect, createApplication);
router.patch('/:id', protect, updateApplication);
router.delete('/:id', protect, deleteApplication);

export default router;
