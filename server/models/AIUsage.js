import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      enum: ['coach', 'job-match', 'resume-analysis', 'roadmap', 'interview-prep'],
    },
    status: {
      type: String,
      enum: ['reserved', 'completed', 'failed', 'rejected'],
      default: 'reserved',
      index: true,
    },
    provider: {
      type: String,
      default: 'gemini',
    },
    model: {
      type: String,
      default: 'gemini-3.5-flash-lite',
    },
    keyUsed: {
      type: String,
      default: 'primary',
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    estimatedTokens: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    dayKey: {
      type: String,
      required: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      index: true,
    },
    minuteKey: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({ user: 1, dayKey: 1, status: 1 });
aiUsageSchema.index({ user: 1, monthKey: 1, status: 1 });
aiUsageSchema.index({ user: 1, minuteKey: 1, status: 1 });
aiUsageSchema.index({ user: 1, createdAt: -1 });

// 90-day retention policy for detailed individual usage events
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AIUsage = mongoose.model('AIUsage', aiUsageSchema);

export default AIUsage;
