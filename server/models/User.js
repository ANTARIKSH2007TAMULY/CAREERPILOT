import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    skills: [{ type: String, trim: true }],
    education: [{
      school: String,
      degree: String,
      field: String,
      startYear: String,
      endYear: String,
    }],
    experience: [{
      title: String,
      company: String,
      location: String,
      startDate: String,
      endDate: String,
      description: String,
    }],
    preferredRoles: [{ type: String, trim: true }],
    preferredLocations: [{ type: String, trim: true }],
    preferredJobTypes: [{ type: String, trim: true }],
    preferredWorkModes: [{ type: String, trim: true }],
    resume: {
      type: String,
      default: '',
    },
    socialLinks: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    notificationPreferences: {
      jobAlerts: { type: Boolean, default: true },
      applicationReminders: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
      unsubscribedAt: { type: Date, default: null },
    },
    googleCalendar: {
      connected: { type: Boolean, default: false },
      connectedEmail: { type: String, default: '', trim: true },
      encryptedAccessToken: { type: String, default: '' },
      encryptedRefreshToken: { type: String, default: '' },
      expiryDate: { type: Date, default: null },
      scope: { type: String, default: '' },
      connectedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
