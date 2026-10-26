import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import { findDemoUserById } from '../config/demoUsers.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const user = isMongoConnected()
      ? await User.findById(decoded.id).select('-password -googleCalendar.encryptedAccessToken -googleCalendar.encryptedRefreshToken')
      : findDemoUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

export default protect;
