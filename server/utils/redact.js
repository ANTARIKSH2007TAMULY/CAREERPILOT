const SECRET_PATTERNS = [
  /re_[A-Za-z0-9_]+/g,
  /GOCSPX-[A-Za-z0-9_-]+/g,
  /AIza[A-Za-z0-9_-]{10,}/g,
  /xai-[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /app_key=[^&\s]+/gi,
  /app_id=[^&\s]+/gi,
  /api_key=[^&\s]+/gi,
];

const SENSITIVE_ENV_KEYS = [
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'GROK_API_KEY',
  'XAI_API_KEY',
  'ADZUNA_APP_ID',
  'ADZUNA_APP_KEY',
  'THEMUSE_API_KEY',
  'RESEND_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'MONGODB_URI',
  'REDIS_URL',
];

export const redactSecrets = (value) => {
  let text = String(value ?? '');

  for (const key of SENSITIVE_ENV_KEYS) {
    const secret = process.env[key];
    if (secret && secret.trim()) {
      text = text.split(secret).join(`[redacted:${key}]`);
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[redacted]');
  }

  return text;
};

export const safeErrorMessage = (error) => redactSecrets(error?.message || String(error || 'Unknown error'));
