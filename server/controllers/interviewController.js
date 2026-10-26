import mongoose from 'mongoose';
import Interview from '../models/Interview.js';
import Application from '../models/Application.js';
import { isMongoConnected } from '../config/db.js';
import {
  createDemoInterview,
  deleteDemoInterview,
  findDemoInterviewById,
  findDemoInterviewsByApplication,
  findDemoInterviewsByUser,
  updateDemoInterview,
} from '../config/demoInterviews.js';
import {
  findDemoApplicationById,
  updateDemoApplication,
} from '../config/demoApplications.js';
import {
  calculateReminders,
  cancelRemindersForInterview,
  generateReminderJobId,
  scheduleRemindersForInterview,
} from '../services/interview/interviewScheduler.js';
import {
  buildInterviewReminderEmail,
  canSendEmail,
  sendEmail,
} from '../services/email/resendService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { safeErrorMessage } from '../utils/redact.js';

const ALLOWED_TYPES = ['Phone', 'Video', 'Technical', 'HR', 'On-site', 'Other'];

export const createInterview = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const userId = req.user._id;

  const {
    startTime,
    endTime = null,
    timezone = req.user.timezone || 'UTC',
    type = 'Video',
    title = '',
    meetingUrl = '',
    location = '',
    interviewer = {},
    notes = '',
    reminderPreferences = {},
  } = req.body;

  if (!startTime) {
    return res.status(400).json({
      success: false,
      message: 'Interview start date and time are required.',
    });
  }

  const startDate = new Date(startTime);
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid interview date or start time format.',
    });
  }

  if (type && !ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid interview type "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
    });
  }

  // Verify ownership of the application
  let application = null;
  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    application = await Application.findOne({ _id: applicationId, user: userId });
  } else {
    application = findDemoApplicationById(applicationId, userId);
  }

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found or unauthorized',
    });
  }

  // Calculate reminders
  const now = new Date();
  const reminders = calculateReminders({
    startTime: startDate,
    preferences: reminderPreferences,
    now,
  });

  let interview = null;
  if (isMongoConnected()) {
    interview = new Interview({
      user: userId,
      application: application._id,
      title: title || `${type} Interview for ${application.jobTitle || 'Role'}`,
      type,
      startTime: startDate,
      endTime: endTime ? new Date(endTime) : null,
      timezone,
      meetingUrl: meetingUrl ? String(meetingUrl).trim() : '',
      location: location ? String(location).trim() : '',
      interviewer: {
        name: interviewer?.name ? String(interviewer.name).trim() : '',
        email: interviewer?.email ? String(interviewer.email).trim() : '',
        title: interviewer?.title ? String(interviewer.title).trim() : '',
      },
      notes: notes ? String(notes).trim() : '',
      status: 'SCHEDULED',
      reminderPreferences: {
        '3d': reminderPreferences['3d'] !== false,
        '1d': reminderPreferences['1d'] !== false,
        '6h': reminderPreferences['6h'] !== false,
        '1h': reminderPreferences['1h'] !== false,
      },
      reminders,
    });

    await interview.save();

    // Schedule delayed BullMQ reminder jobs
    await scheduleRemindersForInterview(interview, { now });
    await interview.save();

    // Update application interviewDate and status if in early stages
    application.interviewDate = startDate;
    if (['SAVED', 'INTERESTED', 'APPLIED', 'ASSESSMENT'].includes(application.status)) {
      application.status = 'INTERVIEW';
      application.statusHistory = application.statusHistory || [];
      application.statusHistory.push({
        status: 'INTERVIEW',
        changedAt: new Date(),
        notes: `Interview scheduled for ${startDate.toLocaleDateString()}`,
      });
    }
    application.interviews = application.interviews || [];
    application.interviews.push(interview._id);
    await application.save();
  } else {
    interview = createDemoInterview({
      user: userId,
      application: application._id,
      title: title || `${type} Interview for ${application.jobTitle || 'Role'}`,
      type,
      startTime: startDate,
      endTime: endTime ? new Date(endTime) : null,
      timezone,
      meetingUrl,
      location,
      interviewer,
      notes,
      reminderPreferences,
      reminders,
    });

    // Schedule delayed reminder jobs
    await scheduleRemindersForInterview(interview, { now });

    // Update demo application
    const appUpdates = { interviewDate: startDate };
    if (['SAVED', 'INTERESTED', 'APPLIED', 'ASSESSMENT'].includes(application.status)) {
      appUpdates.status = 'INTERVIEW';
    }
    updateDemoApplication(application._id, userId, appUpdates);
  }

  return res.status(201).json({
    success: true,
    message: 'Interview scheduled successfully',
    data: { interview },
  });
});

export const getUpcomingInterviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  if (isMongoConnected()) {
    const interviews = await Interview.find({
      user: userId,
      status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
      startTime: { $gte: now },
    })
      .populate('application', 'jobTitle company location status')
      .sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      data: { interviews },
    });
  }

  const interviews = findDemoInterviewsByUser(userId, { upcomingOnly: true });
  // Attach demo application metadata
  const populated = interviews.map((item) => {
    const app = findDemoApplicationById(item.application, userId);
    return {
      ...item,
      application: app
        ? {
            _id: app._id,
            jobTitle: app.jobTitle || app.job?.title || 'Role',
            company: app.company || app.job?.company || 'Company',
            location: app.location || '',
            status: app.status,
          }
        : null,
    };
  });

  return res.status(200).json({
    success: true,
    data: { interviews: populated },
  });
});

export const getInterviewsByApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const userId = req.user._id;

  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const app = await Application.findOne({ _id: applicationId, user: userId });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found or unauthorized' });
    }

    const interviews = await Interview.find({
      application: applicationId,
      user: userId,
    }).sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      data: { interviews },
    });
  }

  const app = findDemoApplicationById(applicationId, userId);
  if (!app) {
    return res.status(404).json({ success: false, message: 'Application not found or unauthorized' });
  }

  const interviews = findDemoInterviewsByApplication(applicationId, userId);
  return res.status(200).json({
    success: true,
    data: { interviews },
  });
});

export const getInterviewById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const interview = await Interview.findOne({ _id: id, user: userId }).populate(
      'application',
      'jobTitle company location status'
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      data: { interview },
    });
  }

  const interview = findDemoInterviewById(id, userId);
  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
  }

  const app = findDemoApplicationById(interview.application, userId);
  const populated = {
    ...interview,
    application: app
      ? {
          _id: app._id,
          jobTitle: app.jobTitle || app.job?.title || 'Role',
          company: app.company || app.job?.company || 'Company',
          location: app.location || '',
          status: app.status,
        }
      : null,
  };

  return res.status(200).json({
    success: true,
    data: { interview: populated },
  });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const allowedUpdates = [
    'startTime',
    'endTime',
    'timezone',
    'type',
    'title',
    'meetingUrl',
    'location',
    'interviewer',
    'notes',
    'status',
    'reminderPreferences',
  ];

  const updates = {};
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  let interview = null;
  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    interview = await Interview.findOne({ _id: id, user: userId });
  } else {
    interview = findDemoInterviewById(id, userId);
  }

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
  }

  // Handle rescheduling if startTime is modified
  let isRescheduled = false;
  if (updates.startTime) {
    const newStart = new Date(updates.startTime);
    if (Number.isNaN(newStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time format' });
    }

    if (newStart.getTime() !== new Date(interview.startTime).getTime()) {
      isRescheduled = true;

      // Cancel previous pending reminders
      await cancelRemindersForInterview(interview);

      // Recalculate reminders for updated date & time
      const prefs = updates.reminderPreferences || interview.reminderPreferences || {};
      const now = new Date();
      interview.reminders = calculateReminders({
        startTime: newStart,
        preferences: prefs,
        now,
      });

      interview.startTime = newStart;
      interview.rescheduledAt = now;
      interview.status = 'SCHEDULED';

      // Schedule new BullMQ delayed jobs
      await scheduleRemindersForInterview(interview, { now });

      // Update application's interviewDate
      if (isMongoConnected()) {
        await Application.findByIdAndUpdate(interview.application, {
          interviewDate: newStart,
        });
      } else {
        updateDemoApplication(interview.application, userId, { interviewDate: newStart });
      }
    }
  }

  if (updates.reminderPreferences && !isRescheduled) {
    interview.reminderPreferences = {
      ...interview.reminderPreferences,
      ...updates.reminderPreferences,
    };
  }

  // Apply other fields
  if (updates.endTime !== undefined) interview.endTime = updates.endTime ? new Date(updates.endTime) : null;
  if (updates.timezone) interview.timezone = updates.timezone;
  if (updates.type) interview.type = updates.type;
  if (updates.title !== undefined) interview.title = updates.title;
  if (updates.meetingUrl !== undefined) interview.meetingUrl = updates.meetingUrl;
  if (updates.location !== undefined) interview.location = updates.location;
  if (updates.notes !== undefined) interview.notes = updates.notes;
  if (updates.status) interview.status = updates.status;

  if (updates.interviewer) {
    interview.interviewer = {
      name: updates.interviewer.name !== undefined ? updates.interviewer.name : interview.interviewer?.name || '',
      email: updates.interviewer.email !== undefined ? updates.interviewer.email : interview.interviewer?.email || '',
      title: updates.interviewer.title !== undefined ? updates.interviewer.title : interview.interviewer?.title || '',
    };
  }

  if (isMongoConnected()) {
    await interview.save();
  } else {
    updateDemoInterview(id, updates, userId);
  }

  return res.status(200).json({
    success: true,
    message: isRescheduled ? 'Interview rescheduled successfully' : 'Interview updated successfully',
    data: { interview },
  });
});

export const deleteInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  let interview = null;
  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    interview = await Interview.findOne({ _id: id, user: userId });
  } else {
    interview = findDemoInterviewById(id, userId);
  }

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
  }

  // Cancel all pending reminders from BullMQ
  await cancelRemindersForInterview(interview);

  if (isMongoConnected()) {
    interview.status = 'CANCELLED';
    interview.cancelledAt = new Date();
    await interview.save();

    // Check if application's interviewDate needs to be cleared
    const application = await Application.findById(interview.application);
    if (application && application.interviewDate && new Date(application.interviewDate).getTime() === new Date(interview.startTime).getTime()) {
      // Find another active interview if any
      const nextInterview = await Interview.findOne({
        application: application._id,
        status: 'SCHEDULED',
        startTime: { $gte: new Date() },
      }).sort({ startTime: 1 });

      application.interviewDate = nextInterview ? nextInterview.startTime : null;
      await application.save();
    }
  } else {
    updateDemoInterview(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    }, userId);

    const app = findDemoApplicationById(interview.application, userId);
    if (app && app.interviewDate && new Date(app.interviewDate).getTime() === new Date(interview.startTime).getTime()) {
      updateDemoApplication(interview.application, userId, { interviewDate: null });
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Interview cancelled and pending reminders removed',
    data: {},
  });
});

export const sendTestEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  let interview = null;
  let application = null;

  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    interview = await Interview.findOne({ _id: id, user: user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
    }
    application = await Application.findById(interview.application);
  } else {
    interview = findDemoInterviewById(id, user._id);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
    }
    application = findDemoApplicationById(interview.application, user._id);
  }

  const payload = buildInterviewReminderEmail({
    user,
    application,
    interview,
    interval: 'test',
  });

  try {
    const result = await sendEmail(payload, { allowSend: true });
    return res.status(200).json({
      success: true,
      message: `Test reminder sent successfully to ${user.email}`,
      data: { resendId: result.id, duplicate: result.duplicate },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Failed to send email: ${safeErrorMessage(err)}`,
    });
  }
});

export const updateReminderPreferences = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reminderPreferences } = req.body;

  if (!reminderPreferences || typeof reminderPreferences !== 'object') {
    return res.status(400).json({ success: false, message: 'reminderPreferences object is required' });
  }

  let interview = null;
  if (isMongoConnected()) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    interview = await Interview.findOne({ _id: id, user: userId });
  } else {
    interview = findDemoInterviewById(id, userId);
  }

  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found or unauthorized' });
  }

  const updatedPrefs = {
    ...interview.reminderPreferences,
    ...reminderPreferences,
  };
  interview.reminderPreferences = updatedPrefs;

  const now = new Date();
  for (const interval of ['3d', '1d', '6h', '1h']) {
    const isEnabled = updatedPrefs[interval] !== false;
    let reminder = (interview.reminders || []).find((r) => r.interval === interval);

    if (reminder) {
      reminder.enabled = isEnabled;
      if (!isEnabled && reminder.status === 'SCHEDULED') {
        reminder.status = 'CANCELLED';
        reminder.error = 'Reminder disabled by user';
      } else if (isEnabled && reminder.status === 'CANCELLED') {
        const dueMs = new Date(reminder.dueTime).getTime();
        if (dueMs > now.getTime()) {
          reminder.status = 'SCHEDULED';
          reminder.error = null;
        } else {
          reminder.status = 'SKIPPED';
          reminder.error = 'Reminder due time has already passed';
        }
      }
    }
  }

  // Reschedule active reminders in queue
  await scheduleRemindersForInterview(interview, { now });

  if (isMongoConnected()) {
    await interview.save();
  } else {
    updateDemoInterview(id, {
      reminderPreferences: updatedPrefs,
      reminders: interview.reminders,
    }, userId);
  }

  return res.status(200).json({
    success: true,
    message: 'Reminder preferences updated successfully',
    data: { interview },
  });
});
