import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: {
      type: String,
      enum: ['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
      default: 'SAVED',
    },
    appliedAt: { type: Date, default: Date.now },
    deadline: { type: Date, default: null },
    notes: { type: String, default: '' },
    nextAction: { type: String, default: '' },
    interviewDate: { type: Date, default: null },
    recruiter: { type: String, default: '' },
    documents: [{ type: String }],
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
