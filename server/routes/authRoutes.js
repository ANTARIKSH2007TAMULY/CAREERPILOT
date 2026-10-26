import express from 'express';
import { getCurrentUser, login, logout, register, updatePassword } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);
router.put('/password', protect, updatePassword);

export default router;
