import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import { findDemoUserById, updateDemoUserById } from '../config/demoUsers.js';
import asyncHandler from '../utils/asyncHandler.js';

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  skills: user.skills || [],
  education: user.education || [],
  experience: user.experience || [],
  preferredRoles: user.preferredRoles || [],
  preferredLocations: user.preferredLocations || [],
  preferredJobTypes: user.preferredJobTypes || [],
  preferredWorkModes: user.preferredWorkModes || [],
  resume: user.resume || '',
  socialLinks: user.socialLinks || {},
  notificationPreferences: user.notificationPreferences || {
    jobAlerts: true,
    applicationReminders: true,
    interviewReminders: true,
  },
  googleCalendar: {
    connected: Boolean(user.googleCalendar?.connected),
    connectedEmail: user.googleCalendar?.connectedEmail || '',
    connectedAt: user.googleCalendar?.connectedAt || null,
  },
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = isMongoConnected()
    ? await User.findById(req.user._id).select('-password')
    : findDemoUserById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'skills',
    'education',
    'experience',
    'preferredRoles',
    'preferredLocations',
    'preferredJobTypes',
    'preferredWorkModes',
    'resume',
    'socialLinks',
    'notificationPreferences',
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const user = isMongoConnected()
    ? await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      }).select('-password')
    : updateDemoUserById(req.user._id, updates);

  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
});
