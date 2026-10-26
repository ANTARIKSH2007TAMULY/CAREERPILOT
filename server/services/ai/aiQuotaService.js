import crypto from 'node:crypto';
import mongoose from 'mongoose';
import env from '../../config/env.js';
import { isMongoConnected } from '../../config/db.js';
import AIUsage from '../../models/AIUsage.js';

// Fallback in-memory store for unit test execution only
const testUsageStore = [];

export const clearTestUsageStore = () => {
  testUsageStore.length = 0;
};

export const getUtcKeys = (date = new Date()) => {
  const iso = date.toISOString();
  const dayKey = iso.slice(0, 10); // 'YYYY-MM-DD'
  const monthKey = iso.slice(0, 7); // 'YYYY-MM'
  const minuteKey = iso.slice(0, 16); // 'YYYY-MM-DDTHH:mm'

  // Next UTC midnight for daily reset
  const nextDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
  // Next UTC month for monthly reset
  const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  // Next UTC minute for rate limit reset
  const nextMinute = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes() + 1, 0, 0));

  return {
    dayKey,
    monthKey,
    minuteKey,
    dailyResetsAt: nextDay.toISOString(),
    monthlyResetsAt: nextMonth.toISOString(),
    minuteResetsAt: nextMinute.toISOString(),
  };
};

export class QuotaExceededError extends Error {
  constructor(message, { code, retryAfterSeconds, resetsAt, limit, current }) {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = 429;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.resetsAt = resetsAt;
    this.limit = limit;
    this.current = current;
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message = 'AI features require a healthy database connection for quota enforcement.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.status = 503;
    this.code = 'DATABASE_UNAVAILABLE_AI_FAIL_CLOSED';
  }
}

export const validateInputSize = (inputText = '', maxTokens = env.aiMaxRequestTokens) => {
  const maxChars = maxTokens * 4;
  if (inputText.length > maxChars) {
    const err = new Error(
      `AI input exceeds maximum allowed size (${inputText.length} characters, limit is ${maxChars} characters / ~${maxTokens} tokens).`
    );
    err.status = 400;
    err.code = 'AI_INPUT_TOO_LARGE';
    throw err;
  }
};

export const estimateTokens = (inputText = '') => {
  const promptTokens = Math.max(1, Math.ceil(inputText.length / 4));
  const outputBudget = env.aiMaxOutputTokens || 2000;
  return promptTokens + outputBudget;
};

export const reserveQuota = async ({ user, feature, inputText = '', requestId = null, timestamp = null, allowTestMock = false }) => {
  if (!user || !user._id) {
    const err = new Error('Authentication required for AI features.');
    err.status = 401;
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  // Fail closed if MongoDB is disconnected, unless explicitly testing with mock
  if (!isMongoConnected() && !allowTestMock) {
    throw new DatabaseUnavailableError();
  }

  // 1. Validate input size
  validateInputSize(inputText, env.aiMaxRequestTokens);

  const reqId = requestId || `ai-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const now = timestamp ? new Date(timestamp) : new Date();
  const { dayKey, monthKey, minuteKey, dailyResetsAt, monthlyResetsAt, minuteResetsAt } = getUtcKeys(now);
  const estimatedTokenCount = estimateTokens(inputText);

  const userId = user._id;

  // Stale reservation threshold: 5 minutes
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (isMongoConnected()) {
    // 2. Aggregate active usage atomically from MongoDB
    const activeFilter = {
      user: new mongoose.Types.ObjectId(String(userId)),
      $or: [
        { status: 'completed' },
        { status: 'reserved', createdAt: { $gte: fiveMinutesAgo } },
      ],
    };

    const [minuteStats, dailyStats, monthlyStats, concurrentStats] = await Promise.all([
      // Per-minute requests
      AIUsage.countDocuments({
        user: userId,
        minuteKey,
        status: { $in: ['completed', 'reserved'] },
      }),
      // Daily requests and tokens
      AIUsage.aggregate([
        { $match: { ...activeFilter, dayKey } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            totalTokens: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$totalTokens', '$estimatedTokens'],
              },
            },
          },
        },
      ]),
      // Monthly requests and tokens
      AIUsage.aggregate([
        { $match: { ...activeFilter, monthKey } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            totalTokens: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$totalTokens', '$estimatedTokens'],
              },
            },
          },
        },
      ]),
      // In-flight concurrent requests
      AIUsage.countDocuments({
        user: userId,
        status: 'reserved',
        createdAt: { $gte: fiveMinutesAgo },
      }),
    ]);

    const minuteRequests = minuteStats;
    const dailyRequests = dailyStats[0]?.totalRequests || 0;
    const dailyTokens = dailyStats[0]?.totalTokens || 0;
    const monthlyRequests = monthlyStats[0]?.totalRequests || 0;
    const monthlyTokens = monthlyStats[0]?.totalTokens || 0;
    const concurrentRequests = concurrentStats;

    // 3. Enforce Quotas & Limits
    if (minuteRequests >= env.aiRateLimitPerMinute) {
      const retrySec = Math.max(1, Math.ceil((new Date(minuteResetsAt).getTime() - now.getTime()) / 1000));
      throw new QuotaExceededError(
        `Rate limit exceeded. You may send up to ${env.aiRateLimitPerMinute} requests per minute.`,
        {
          code: 'AI_RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: retrySec,
          resetsAt: minuteResetsAt,
          limit: env.aiRateLimitPerMinute,
          current: minuteRequests,
        }
      );
    }

    if (concurrentRequests >= 2) {
      throw new QuotaExceededError('Another AI request is currently in progress. Please wait for it to complete.', {
        code: 'AI_CONCURRENT_LIMIT_EXCEEDED',
        retryAfterSeconds: 5,
        resetsAt: new Date(now.getTime() + 5000).toISOString(),
        limit: 2,
        current: concurrentRequests,
      });
    }

    if (dailyRequests >= env.aiDailyRequestLimit) {
      const retrySec = Math.max(1, Math.ceil((new Date(dailyResetsAt).getTime() - now.getTime()) / 1000));
      throw new QuotaExceededError(
        `Daily AI request limit reached (${env.aiDailyRequestLimit} requests/day). Resets at midnight UTC.`,
        {
          code: 'AI_DAILY_REQUEST_LIMIT_EXCEEDED',
          retryAfterSeconds: retrySec,
          resetsAt: dailyResetsAt,
          limit: env.aiDailyRequestLimit,
          current: dailyRequests,
        }
      );
    }

    if (monthlyRequests >= env.aiMonthlyRequestLimit) {
      const retrySec = Math.max(1, Math.ceil((new Date(monthlyResetsAt).getTime() - now.getTime()) / 1000));
      throw new QuotaExceededError(
        `Monthly AI request limit reached (${env.aiMonthlyRequestLimit} requests/month).`,
        {
          code: 'AI_MONTHLY_REQUEST_LIMIT_EXCEEDED',
          retryAfterSeconds: retrySec,
          resetsAt: monthlyResetsAt,
          limit: env.aiMonthlyRequestLimit,
          current: monthlyRequests,
        }
      );
    }

    if (dailyTokens + estimatedTokenCount > env.aiDailyTokenLimit) {
      const retrySec = Math.max(1, Math.ceil((new Date(dailyResetsAt).getTime() - now.getTime()) / 1000));
      throw new QuotaExceededError(
        `Daily AI token budget reached (${env.aiDailyTokenLimit} tokens/day).`,
        {
          code: 'AI_DAILY_TOKEN_LIMIT_EXCEEDED',
          retryAfterSeconds: retrySec,
          resetsAt: dailyResetsAt,
          limit: env.aiDailyTokenLimit,
          current: dailyTokens,
        }
      );
    }

    if (monthlyTokens + estimatedTokenCount > env.aiMonthlyTokenLimit) {
      const retrySec = Math.max(1, Math.ceil((new Date(monthlyResetsAt).getTime() - now.getTime()) / 1000));
      throw new QuotaExceededError(
        `Monthly AI token budget reached (${env.aiMonthlyTokenLimit} tokens/month).`,
        {
          code: 'AI_MONTHLY_TOKEN_LIMIT_EXCEEDED',
          retryAfterSeconds: retrySec,
          resetsAt: monthlyResetsAt,
          limit: env.aiMonthlyTokenLimit,
          current: monthlyTokens,
        }
      );
    }

    // 4. Create atomic reservation record
    const reservation = await AIUsage.create({
      user: userId,
      requestId: reqId,
      feature,
      status: 'reserved',
      provider: 'gemini',
      model: env.geminiModel,
      estimatedTokens: estimatedTokenCount,
      dayKey,
      monthKey,
      minuteKey,
    });

    return {
      reservationId: reservation._id,
      requestId: reqId,
      estimatedTokens: estimatedTokenCount,
    };
  }

  // In-memory test mock store branch (used only during tests when allowTestMock is true)
  const minuteReqs = testUsageStore.filter(
    (e) => String(e.user) === String(userId) && e.minuteKey === minuteKey && e.status !== 'failed'
  ).length;
  if (minuteReqs >= env.aiRateLimitPerMinute) {
    throw new QuotaExceededError('Rate limit exceeded', {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: 60,
      resetsAt: minuteResetsAt,
      limit: env.aiRateLimitPerMinute,
      current: minuteReqs,
    });
  }

  const concurrentReqs = testUsageStore.filter(
    (e) => String(e.user) === String(userId) && e.status === 'reserved' && e.createdAt >= fiveMinutesAgo
  ).length;
  if (concurrentReqs >= 2) {
    throw new QuotaExceededError('Another AI request is currently in progress.', {
      code: 'AI_CONCURRENT_LIMIT_EXCEEDED',
      retryAfterSeconds: 5,
      resetsAt: new Date(now.getTime() + 5000).toISOString(),
      limit: 2,
      current: concurrentReqs,
    });
  }

  const dailyReqs = testUsageStore.filter(
    (e) => String(e.user) === String(userId) && e.dayKey === dayKey && e.status !== 'failed'
  ).length;
  if (dailyReqs >= env.aiDailyRequestLimit) {
    throw new QuotaExceededError('Daily limit reached', {
      code: 'AI_DAILY_REQUEST_LIMIT_EXCEEDED',
      retryAfterSeconds: 3600,
      resetsAt: dailyResetsAt,
      limit: env.aiDailyRequestLimit,
      current: dailyReqs,
    });
  }

  const monthlyReqs = testUsageStore.filter(
    (e) => String(e.user) === String(userId) && e.monthKey === monthKey && e.status !== 'failed'
  ).length;
  if (monthlyReqs >= env.aiMonthlyRequestLimit) {
    throw new QuotaExceededError('Monthly limit reached', {
      code: 'AI_MONTHLY_REQUEST_LIMIT_EXCEEDED',
      retryAfterSeconds: 86400,
      resetsAt: monthlyResetsAt,
      limit: env.aiMonthlyRequestLimit,
      current: monthlyReqs,
    });
  }

  const dailyTokens = testUsageStore
    .filter((e) => String(e.user) === String(userId) && e.dayKey === dayKey && e.status !== 'failed')
    .reduce((sum, e) => sum + (e.status === 'completed' ? e.totalTokens : e.estimatedTokens), 0);
  if (dailyTokens + estimatedTokenCount > env.aiDailyTokenLimit) {
    throw new QuotaExceededError('Daily token budget reached', {
      code: 'AI_DAILY_TOKEN_LIMIT_EXCEEDED',
      retryAfterSeconds: 3600,
      resetsAt: dailyResetsAt,
      limit: env.aiDailyTokenLimit,
      current: dailyTokens,
    });
  }

  const monthlyTokens = testUsageStore
    .filter((e) => String(e.user) === String(userId) && e.monthKey === monthKey && e.status !== 'failed')
    .reduce((sum, e) => sum + (e.status === 'completed' ? e.totalTokens : e.estimatedTokens), 0);
  if (monthlyTokens + estimatedTokenCount > env.aiMonthlyTokenLimit) {
    throw new QuotaExceededError('Monthly token budget reached', {
      code: 'AI_MONTHLY_TOKEN_LIMIT_EXCEEDED',
      retryAfterSeconds: 86400,
      resetsAt: monthlyResetsAt,
      limit: env.aiMonthlyTokenLimit,
      current: monthlyTokens,
    });
  }

  const mockReservation = {
    _id: `mock-res-${Date.now()}-${Math.random()}`,
    user: String(userId),
    requestId: reqId,
    feature,
    status: 'reserved',
    estimatedTokens: estimatedTokenCount,
    totalTokens: 0,
    dayKey,
    monthKey,
    minuteKey,
    createdAt: now,
  };
  testUsageStore.push(mockReservation);

  return {
    reservationId: mockReservation._id,
    requestId: reqId,
    estimatedTokens: estimatedTokenCount,
  };
};

export const reconcileUsage = async (reservationId, { inputTokens = 0, outputTokens = 0, totalTokens = 0, durationMs = 0, model = 'gemini-3.5-flash-lite', keyUsed = 'primary' } = {}) => {
  if (!reservationId) return null;

  const actualTotal = totalTokens || (inputTokens + outputTokens);

  if (isMongoConnected()) {
    return AIUsage.findByIdAndUpdate(
      reservationId,
      {
        status: 'completed',
        inputTokens,
        outputTokens,
        totalTokens: actualTotal,
        durationMs,
        model,
        keyUsed,
      },
      { new: true }
    );
  }

  const mock = testUsageStore.find((e) => String(e._id) === String(reservationId));
  if (mock) {
    mock.status = 'completed';
    mock.inputTokens = inputTokens;
    mock.outputTokens = outputTokens;
    mock.totalTokens = actualTotal;
    mock.durationMs = durationMs;
  }
  return mock || null;
};

export const releaseReservation = async (reservationId, reason = 'failed') => {
  if (!reservationId) return null;

  if (isMongoConnected()) {
    return AIUsage.findByIdAndUpdate(
      reservationId,
      {
        status: 'failed',
        totalTokens: 0,
        estimatedTokens: 0,
      },
      { new: true }
    );
  }

  const mock = testUsageStore.find((e) => String(e._id) === String(reservationId));
  if (mock) {
    mock.status = 'failed';
    mock.totalTokens = 0;
    mock.estimatedTokens = 0;
  }
  return mock || null;
};

export const getUserUsageSummary = async (userId) => {
  const now = new Date();
  const { dayKey, monthKey, minuteKey, dailyResetsAt, monthlyResetsAt, minuteResetsAt } = getUtcKeys(now);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (!isMongoConnected()) {
    const userEvents = testUsageStore.filter((e) => String(e.user) === String(userId) && e.status !== 'failed');
    const minuteReqs = userEvents.filter((e) => e.minuteKey === minuteKey).length;
    const dailyReqs = userEvents.filter((e) => e.dayKey === dayKey).length;
    const dailyTokens = userEvents
      .filter((e) => e.dayKey === dayKey)
      .reduce((sum, e) => sum + (e.status === 'completed' ? e.totalTokens : e.estimatedTokens), 0);
    const monthlyReqs = userEvents.filter((e) => e.monthKey === monthKey).length;
    const monthlyTokens = userEvents
      .filter((e) => e.monthKey === monthKey)
      .reduce((sum, e) => sum + (e.status === 'completed' ? e.totalTokens : e.estimatedTokens), 0);

    return {
      daily: {
        requestsUsed: dailyReqs,
        requestsRemaining: Math.max(0, env.aiDailyRequestLimit - dailyReqs),
        requestLimit: env.aiDailyRequestLimit,
        tokensUsed: dailyTokens,
        tokensRemaining: Math.max(0, env.aiDailyTokenLimit - dailyTokens),
        tokenLimit: env.aiDailyTokenLimit,
        resetsAt: dailyResetsAt,
      },
      monthly: {
        requestsUsed: monthlyReqs,
        requestsRemaining: Math.max(0, env.aiMonthlyRequestLimit - monthlyReqs),
        requestLimit: env.aiMonthlyRequestLimit,
        tokensUsed: monthlyTokens,
        tokensRemaining: Math.max(0, env.aiMonthlyTokenLimit - monthlyTokens),
        tokenLimit: env.aiMonthlyTokenLimit,
        resetsAt: monthlyResetsAt,
      },
      rateLimit: {
        requestsThisMinute: minuteReqs,
        limitPerMinute: env.aiRateLimitPerMinute,
        resetsAt: minuteResetsAt,
      },
      provider: {
        active: Boolean(env.geminiApiKey),
        dualKeyConfigured: Boolean(env.geminiApiKey && env.geminiApiKey2),
        model: env.geminiModel,
      },
    };
  }

  const activeFilter = {
    user: new mongoose.Types.ObjectId(String(userId)),
    $or: [
      { status: 'completed' },
      { status: 'reserved', createdAt: { $gte: fiveMinutesAgo } },
    ],
  };

  const [minuteStats, dailyStats, monthlyStats] = await Promise.all([
    AIUsage.countDocuments({
      user: userId,
      minuteKey,
      status: { $in: ['completed', 'reserved'] },
    }),
    AIUsage.aggregate([
      { $match: { ...activeFilter, dayKey } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalTokens', '$estimatedTokens'],
            },
          },
        },
      },
    ]),
    AIUsage.aggregate([
      { $match: { ...activeFilter, monthKey } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalTokens', '$estimatedTokens'],
            },
          },
        },
      },
    ]),
  ]);

  const requestsToday = dailyStats[0]?.totalRequests || 0;
  const tokensToday = dailyStats[0]?.totalTokens || 0;

  const requestsMonth = monthlyStats[0]?.totalRequests || 0;
  const tokensMonth = monthlyStats[0]?.totalTokens || 0;

  return {
    daily: {
      requestsUsed: requestsToday,
      requestsRemaining: Math.max(0, env.aiDailyRequestLimit - requestsToday),
      requestLimit: env.aiDailyRequestLimit,
      tokensUsed: tokensToday,
      tokensRemaining: Math.max(0, env.aiDailyTokenLimit - tokensToday),
      tokenLimit: env.aiDailyTokenLimit,
      resetsAt: dailyResetsAt,
    },
    monthly: {
      requestsUsed: requestsMonth,
      requestsRemaining: Math.max(0, env.aiMonthlyRequestLimit - requestsMonth),
      requestLimit: env.aiMonthlyRequestLimit,
      tokensUsed: tokensMonth,
      tokensRemaining: Math.max(0, env.aiMonthlyTokenLimit - tokensMonth),
      tokenLimit: env.aiMonthlyTokenLimit,
      resetsAt: monthlyResetsAt,
    },
    rateLimit: {
      requestsThisMinute: minuteStats,
      limitPerMinute: env.aiRateLimitPerMinute,
      resetsAt: minuteResetsAt,
    },
    provider: {
      active: Boolean(env.geminiApiKey),
      dualKeyConfigured: Boolean(env.geminiApiKey && env.geminiApiKey2),
      model: env.geminiModel,
    },
  };
};
