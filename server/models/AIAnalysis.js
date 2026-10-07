import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    matchScore: { type: Number, default: 0 },
    strengths: [{ type: String }],
    missingSkills: [{ type: String }],
    recommendations: [{ type: String }],
    summary: { type: String, default: '' },
    provider: { type: String, default: 'heuristic' },
  },
  { timestamps: true }
);

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);

export default AIAnalysis;
