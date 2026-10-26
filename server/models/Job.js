import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: '' },
    description: { type: String, required: true },
    location: { type: String, default: '', trim: true },
    jobType: { type: String, enum: ['Full-time', 'Internship', 'Contract', 'Part-time'], default: 'Full-time' },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site', 'Unspecified'], default: 'Unspecified' },
    experienceLevel: { type: String, enum: ['Entry', 'Mid', 'Senior'], default: 'Entry' },
    skills: [{ type: String, trim: true }],
    salary: { type: String, default: '' },
    source: { type: String, default: 'CareerPilot' },
    providerJobId: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    applyUrl: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    postedAt: { type: Date, default: null },
    deadline: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', company: 'text', description: 'text' });
jobSchema.index({ skills: 1 });
jobSchema.index({ postedAt: -1, isActive: 1 });
jobSchema.index({ location: 1, jobType: 1, workMode: 1, experienceLevel: 1, postedAt: -1 });
jobSchema.index(
  { source: 1, providerJobId: 1 },
  { unique: true, partialFilterExpression: { providerJobId: { $type: 'string', $gt: '' } } }
);

const Job = mongoose.model('Job', jobSchema);

export default Job;
