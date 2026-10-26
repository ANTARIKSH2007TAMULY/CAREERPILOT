import mongoose from 'mongoose';

const reminderItemSchema = new mongoose.Schema(
  {
    interval: {
      type: String,
      enum: ['3d', '1d', '6h', '1h'],
      required: true,
    },
    dueTime: {
      type: Date,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED'],
      default: 'SCHEDULED',
    },
    jobId: {
      type: String,
      default: '',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resendId: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['Phone', 'Video', 'Technical', 'HR', 'On-site', 'Other'],
      default: 'Video',
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    meetingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    interviewer: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      title: { type: String, trim: true, default: '' },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
      default: 'SCHEDULED',
      index: true,
    },
    reminderPreferences: {
      '3d': { type: Boolean, default: true },
      '1d': { type: Boolean, default: true },
      '6h': { type: Boolean, default: true },
      '1h': { type: Boolean, default: true },
    },
    reminders: [reminderItemSchema],
    cancelledAt: {
      type: Date,
      default: null,
    },
    rescheduledAt: {
      type: Date,
      default: null,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
    rescheduledTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
  },
  { timestamps: true }
);

interviewSchema.index({ user: 1, startTime: 1 });
interviewSchema.index({ application: 1, startTime: 1 });
interviewSchema.index({ user: 1, status: 1 });
interviewSchema.index({ status: 1, startTime: 1 });
interviewSchema.index({ 'reminders.status': 1, 'reminders.dueTime': 1 });

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;
