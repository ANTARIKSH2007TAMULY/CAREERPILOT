import mongoose from 'mongoose';
import { getConfigStatus } from '../config/env.js';
import { isMongoConnected } from '../config/db.js';
import { isRedisEnabled, pingRedis } from '../config/redis.js';
import { getConfiguredJobProviders } from '../services/jobs/jobAggregator.js';
import { hasResendCredentials } from '../services/email/resendService.js';
import { hasGoogleCalendarConfig } from '../services/calendar/googleCalendarService.js';

export const getLiveness = (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
  });
};

export const getReadiness = async (req, res) => {
  const config = getConfigStatus();
  const redisOk = await pingRedis();

  res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      mongo: {
        configured: config.required.mongoUri,
        operational: isMongoConnected() || mongoose.connection.readyState === 1,
      },
      redis: {
        configured: config.optional.redis,
        operational: Boolean(isRedisEnabled() && redisOk),
      },
      providers: {
        jobs: getConfiguredJobProviders().map((provider) => ({
          name: provider.name,
          configured: provider.configured,
          operational: null,
        })),
        gemini: { configured: config.optional.gemini, dualKey: config.optional.geminiDualKey, operational: null },
        resend: { configured: hasResendCredentials(), operational: null },
        googleCalendar: { configured: hasGoogleCalendarConfig(), operational: null },
      },
    },
  });
};
