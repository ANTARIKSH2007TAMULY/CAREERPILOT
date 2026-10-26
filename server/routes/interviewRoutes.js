import express from 'express';
import {
  createInterview,
  deleteInterview,
  getInterviewById,
  getInterviewsByApplication,
  getUpcomingInterviews,
  sendTestEmail,
  updateInterview,
  updateReminderPreferences,
} from '../controllers/interviewController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/upcoming', protect, getUpcomingInterviews);
router.get('/:id', protect, getInterviewById);
router.patch('/:id', protect, updateInterview);
router.delete('/:id', protect, deleteInterview);
router.post('/:id/test-email', protect, sendTestEmail);
router.patch('/:id/reminders', protect, updateReminderPreferences);

export default router;
