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
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
