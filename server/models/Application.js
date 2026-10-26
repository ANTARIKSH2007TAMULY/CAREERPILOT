import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: false, default: null },
    jobTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    companyLogo: { type: String, default: '' },
    location: { type: String, default: '' },
    salary: { type: String, default: '' },
    applyUrl: { type: String, default: '' },
    providerJobId: { type: String, default: '' },
    source: { type: String, default: '' },
    status: {
      type: String,
      enum: ['SAVED', 'INTERESTED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
      default: 'INTERESTED',
    },
    appliedAt: { type: Date, default: null },
    deadline: { type: Date, default: null },
    interviewDate: { type: Date, default: null },
    interviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interview' }],
    offerSalary: { type: String, default: '' },
    offerDeadline: { type: Date, default: null },
    notes: { type: String, default: '' },
    nextAction: { type: String, default: '' },
    recruiter: { type: String, default: '' },
    documents: [{ type: String }],
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, status: 1 });
applicationSchema.index({ user: 1, job: 1 });
applicationSchema.index({ user: 1, providerJobId: 1 });
applicationSchema.index({ user: 1, appliedAt: -1 });
applicationSchema.index({ user: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
