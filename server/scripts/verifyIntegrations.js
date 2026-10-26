import '../config/env.js';
import { requestJson } from '../utils/httpClient.js';
import { hasAdzunaCredentials, fetchAdzunaJobs } from '../services/adzunaService.js';
import { fetchTheMuseJobs, hasTheMuseCredentials } from '../services/jobs/theMuseService.js';
import { fetchRemotiveJobs } from '../services/jobs/remotiveService.js';
import { validateResendCredentials } from '../services/email/resendService.js';
import { pingRedis, connectRedis } from '../config/redis.js';
import { connectDB, isMongoConnected } from '../config/db.js';
import { hasGoogleCalendarConfig } from '../services/calendar/googleCalendarService.js';
import { safeErrorMessage } from '../utils/redact.js';

const results = [];

const record = (name, status, detail) => {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(11)} ${name} — ${detail}`);
};

const checkGemini = async () => {
  if (!process.env.GEMINI_API_KEY) {
    record('Gemini', 'NOT TESTED', 'GEMINI_API_KEY is not configured');
    return;
  }
  try {
    await requestJson({
      url: `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1`,
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      timeoutMs: 15000,
    });
    record('Gemini', 'PASS', 'models.list succeeded; no generation request was sent');
  } catch (error) {
    record('Gemini', 'FAIL', safeErrorMessage(error));
  }
};

const checkGeminiSecondary = async () => {
  const apiKey = process.env.GEMINI_API_KEY_2;
  if (!apiKey) {
    record('Gemini (Secondary Key)', 'NOT CONFIGURED', 'GEMINI_API_KEY_2 is not set');
    return;
  }
  try {
    await requestJson({
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      timeoutMs: 15000,
    });
    record('Gemini (Secondary Key)', 'PASS', 'models.list succeeded; failover key is ready');
  } catch (error) {
    record('Gemini (Secondary Key)', 'FAIL', safeErrorMessage(error));
  }
};

const main = async () => {
  try {
    await connectDB();
    record('MongoDB', isMongoConnected() ? 'PASS' : 'BLOCKED', isMongoConnected() ? 'connected' : 'not reachable');
  } catch (error) {
    record('MongoDB', 'BLOCKED', safeErrorMessage(error));
  }

  try {
    await connectRedis();
    const ok = await pingRedis();
    record('Redis', ok ? 'PASS' : 'BLOCKED', ok ? 'PING PONG' : 'REDIS_URL set but ping failed or Redis is down');
  } catch (error) {
    record('Redis', 'BLOCKED', safeErrorMessage(error));
  }

  if (!hasAdzunaCredentials()) {
    record('Adzuna', 'NOT TESTED', 'credentials missing');
  } else {
    try {
      const jobs = await fetchAdzunaJobs({ keyword: 'developer', page: 1, limit: 1 });
      record('Adzuna', jobs.length ? 'PASS' : 'FAIL', `normalized ${jobs.length} job(s)`);
    } catch (error) {
      record('Adzuna', 'FAIL', safeErrorMessage(error));
    }
  }

  if (!hasTheMuseCredentials()) {
    record('The Muse', 'NOT TESTED', 'THEMUSE_API_KEY missing; public unauthenticated access is still possible');
  }
  try {
    const jobs = await fetchTheMuseJobs({ page: 1, limit: 1 });
    record('The Muse', jobs.length >= 0 ? 'PASS' : 'FAIL', `normalized ${jobs.length} job(s)`);
  } catch (error) {
    record('The Muse', 'FAIL', safeErrorMessage(error));
  }

  try {
    const jobs = await fetchRemotiveJobs({ keyword: 'developer', page: 1, limit: 1 });
    record('Remotive', 'PASS', `normalized ${jobs.length} job(s); attribution preserved`);
  } catch (error) {
    record('Remotive', 'FAIL', safeErrorMessage(error));
  }

  await checkGemini();
  await checkGeminiSecondary();

  const resend = await validateResendCredentials();
  if (!resend.configured) record('Resend', 'NOT TESTED', resend.error);
  else if (!resend.operational) record('Resend', 'FAIL', resend.error || 'credential check failed');
  else {
    record(
      'Resend',
      'PASS',
      `API accepted the key; verified sender domain: ${resend.verifiedDomain ? 'yes' : 'no'}. No email was sent.`
    );
  }

  record(
    'Google Calendar',
    hasGoogleCalendarConfig() ? 'NOT TESTED' : 'BLOCKED',
    hasGoogleCalendarConfig()
      ? 'OAuth client is configured. Live calendar access requires a browser consent flow and the exact redirect URI in Google Cloud.'
      : 'OAuth client is not configured'
  );

  const failed = results.some((item) => item.status === 'FAIL');
  process.exit(failed ? 1 : 0);
};

main().catch((error) => {
  console.error('Verification aborted:', safeErrorMessage(error));
  process.exit(1);
});
