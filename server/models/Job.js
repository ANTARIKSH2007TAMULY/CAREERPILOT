import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: '' },
    description: { type: String, required: true },
    location: { type: String, default: 'Remote' },
    jobType: { type: String, enum: ['Full-time', 'Internship', 'Contract', 'Part-time'], default: 'Full-time' },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], default: 'Remote' },
    experienceLevel: { type: String, enum: ['Entry', 'Mid', 'Senior'], default: 'Entry' },
    skills: [{ type: String, trim: true }],
    salary: { type: String, default: '' },
    source: { type: String, default: 'CareerPilot' },
    sourceUrl: { type: String, default: '' },
    applyUrl: { type: String, required: true },
    postedAt: { type: Date, default: Date.now },
    deadline: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', company: 'text', description: 'text', skills: 1 });
jobSchema.index({ location: 1, jobType: 1, workMode: 1, experienceLevel: 1, postedAt: -1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;
