import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: false, default: null },
    jobSnapshot: {
      title: { type: String, default: '' },
      company: { type: String, default: '' },
      companyLogo: { type: String, default: '' },
      location: { type: String, default: '' },
      workMode: { type: String, default: 'Unspecified' },
      salary: { type: String, default: '' },
      description: { type: String, default: '' },
      skills: [{ type: String }],
      applyUrl: { type: String, default: '' },
      sourceUrl: { type: String, default: '' },
      source: { type: String, default: '' },
      providerJobId: { type: String, default: '' },
      postedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

savedJobSchema.index({ user: 1, job: 1 }, { unique: true, sparse: true });
savedJobSchema.index({ user: 1, 'jobSnapshot.providerJobId': 1 });
savedJobSchema.index({ user: 1, 'jobSnapshot.sourceUrl': 1 });

const SavedJob = mongoose.model('SavedJob', savedJobSchema);

export default SavedJob;
