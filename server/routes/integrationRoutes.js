import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  disconnectGoogle,
  getGoogleCalendarEvents,
  getGoogleStatus,
  googleOAuthCallback,
  startGoogleOAuth,
  testGoogleConnection,
} from '../controllers/integrationController.js';

const router = express.Router();

router.get('/google/status', protect, getGoogleStatus);
router.get('/google/connect', protect, startGoogleOAuth);
router.get('/google/callback', googleOAuthCallback);
router.get('/google/events', protect, getGoogleCalendarEvents);
router.post('/google/disconnect', protect, disconnectGoogle);
router.get('/google/test', protect, testGoogleConnection);

export default router;
