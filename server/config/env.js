import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of candidatePaths) {
  dotenv.config({ path: envPath });
}

const trim = (value, fallback = '') => {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isSet = (value) => Boolean(trim(value));

export const getEnvSnapshot = () => ({
  port: Number(process.env.PORT) || 5001,
  mongoUri: trim(process.env.MONGODB_URI, 'mongodb://127.0.0.1:27017/careerpilot'),
  jwtSecret: trim(process.env.JWT_SECRET, 'dev-secret-change-me'),
  clientUrl: trim(process.env.CLIENT_URL, 'http://localhost:5173'),
  redisUrl: trim(process.env.REDIS_URL),
  geminiApiKey: trim(process.env.GEMINI_API_KEY),
  geminiApiKey2: trim(process.env.GEMINI_API_KEY_2),
  aiProvider: 'gemini',
  geminiModel: trim(process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite'),

  // AI Usage Quotas & Limits
  aiDailyRequestLimit: parsePositiveInt(process.env.AI_DAILY_REQUEST_LIMIT, 20),
  aiMonthlyRequestLimit: parsePositiveInt(process.env.AI_MONTHLY_REQUEST_LIMIT, 300),
  aiDailyTokenLimit: parsePositiveInt(process.env.AI_DAILY_TOKEN_LIMIT, 50000),
  aiMonthlyTokenLimit: parsePositiveInt(process.env.AI_MONTHLY_TOKEN_LIMIT, 500000),
  aiMaxRequestTokens: parsePositiveInt(process.env.AI_MAX_REQUEST_TOKENS, 6000),
  aiMaxOutputTokens: parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS, 2000),
  aiRateLimitPerMinute: parsePositiveInt(process.env.AI_RATE_LIMIT_PER_MINUTE, 5),
  aiUsageTimezone: trim(process.env.AI_USAGE_TIMEZONE, 'UTC'),

  adzunaAppId: trim(process.env.ADZUNA_APP_ID),
  adzunaAppKey: trim(process.env.ADZUNA_APP_KEY),
  adzunaCountry: trim(process.env.ADZUNA_COUNTRY, 'in'),
  themuseApiKey: trim(process.env.THEMUSE_API_KEY),
  resendApiKey: trim(process.env.RESEND_API_KEY),
  emailFrom: trim(process.env.EMAIL_FROM, 'CareerPilot <beth.t@example.com>'),
  googleClientId: trim(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: trim(process.env.GOOGLE_CLIENT_SECRET),
  googleRedirectUri: trim(process.env.GOOGLE_REDIRECT_URI, 'http://localhost:5001/api/integrations/google/callback'),
});

export const getConfigStatus = () => {
  const production = process.env.NODE_ENV === 'production';
  const jwtConfigured = isSet(process.env.JWT_SECRET) && process.env.JWT_SECRET !== 'dev-secret-change-me';

  return {
    required: {
      jwtSecret: jwtConfigured || !production,
      mongoUri: isSet(process.env.MONGODB_URI) || !production,
    },
    optional: {
      redis: isSet(process.env.REDIS_URL),
      gemini: isSet(process.env.GEMINI_API_KEY),
      geminiDualKey: isSet(process.env.GEMINI_API_KEY) && isSet(process.env.GEMINI_API_KEY_2),
      adzuna: isSet(process.env.ADZUNA_APP_ID) && isSet(process.env.ADZUNA_APP_KEY),
      themuse: true,
      remotive: true,
      resend: isSet(process.env.RESEND_API_KEY),
      googleCalendar:
        isSet(process.env.GOOGLE_CLIENT_ID) &&
        isSet(process.env.GOOGLE_CLIENT_SECRET) &&
        isSet(process.env.GOOGLE_REDIRECT_URI),
    },
  };
};

export const validateEnvOnStartup = () => {
  const status = getConfigStatus();
  const missingRequired = Object.entries(status.required)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missingRequired.length > 0) {
    throw new Error(`Missing required environment configuration: ${missingRequired.join(', ')}`);
  }

  console.log('[config] required infrastructure:', Object.keys(status.required).join(', '));
  console.log(
    '[config] optional integrations configured:',
    Object.entries(status.optional)
      .filter(([, configured]) => configured)
      .map(([name]) => name)
      .join(', ') || 'none'
  );
};

const env = getEnvSnapshot();
export default env;
