import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import {
  createDemoUser,
  findDemoUserByEmail,
  findDemoUserById,
} from '../config/demoUsers.js';
import asyncHandler from '../utils/asyncHandler.js';

const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: '7d',
  });

const getUserByEmail = async (email) => {
  if (!isMongoConnected()) {
    return findDemoUserByEmail(email);
  }

  return User.findOne({ email: email.toLowerCase().trim() });
};

const getUserById = async (id) => {
  if (!isMongoConnected()) {
    return findDemoUserById(id);
  }

  return User.findById(id).select('-password');
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let createdUser;

  if (!isMongoConnected()) {
    createdUser = createDemoUser({
      _id: `demo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      skills: [],
      preferredRoles: [],
      preferredLocations: [],
      preferredJobTypes: [],
      preferredWorkModes: [],
      socialLinks: {
        linkedin: '',
        github: '',
        portfolio: '',
      },
    });
  } else {
    createdUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      skills: [],
      preferredRoles: [],
      preferredLocations: [],
      preferredJobTypes: [],
      preferredWorkModes: [],
      socialLinks: {
        linkedin: '',
        github: '',
        portfolio: '',
      },
    });
  }

  const token = generateToken(createdUser._id);
  res.cookie('jwt', token, cookieOptions);

  return res.status(201).json({
    success: true,
    data: {
      user: sanitizeUser(createdUser),
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  const token = generateToken(user._id);
  res.cookie('jwt', token, cookieOptions);

  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  return res.status(200).json({
    success: true,
    data: {},
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const currentUser = await getUserById(req.user._id);

  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(currentUser),
    },
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long',
    });
  }

  const user = isMongoConnected()
    ? await User.findById(req.user._id)
    : findDemoUserById(req.user._id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  if (isMongoConnected()) {
    await user.save();
  }

  return res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});
