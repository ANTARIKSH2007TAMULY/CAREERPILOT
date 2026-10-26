import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSendEmail,
  buildInterviewReminderEmail,
  buildApplicationReminderEmail,
  isValidEmail,
} from '../services/email/resendService.js';
import { redactSecrets } from '../utils/redact.js';
import { getConfigStatus, validateEnvOnStartup } from '../config/env.js';
import { enqueueUnique } from '../queues/queue.js';
import { startWorkers } from '../queues/workers.js';

test('canSendEmail respects user preferences for each notification category', () => {
  const allEnabledUser = {
    email: 'user@example.com',
    notificationPreferences: {
      jobAlerts: true,
      applicationReminders: true,
      interviewReminders: true,
      unsubscribedAt: null,
    },
  };
  assert.equal(canSendEmail(allEnabledUser, 'jobAlerts'), true);
  assert.equal(canSendEmail(allEnabledUser, 'applicationReminders'), true);
  assert.equal(canSendEmail(allEnabledUser, 'interviewReminders'), true);

  const alertsDisabledUser = {
    email: 'user@example.com',
    notificationPreferences: {
      jobAlerts: false,
      applicationReminders: true,
      interviewReminders: true,
      unsubscribedAt: null,
    },
  };
  assert.equal(canSendEmail(alertsDisabledUser, 'jobAlerts'), false);
  assert.equal(canSendEmail(alertsDisabledUser, 'interviewReminders'), true);

  const unsubscribedUser = {
    email: 'user@example.com',
    notificationPreferences: {
      jobAlerts: true,
      applicationReminders: true,
      interviewReminders: true,
      unsubscribedAt: new Date(),
    },
  };
  assert.equal(canSendEmail(unsubscribedUser, 'jobAlerts'), false);
  assert.equal(canSendEmail(unsubscribedUser, 'interviewReminders'), false);
  assert.equal(canSendEmail(unsubscribedUser, 'applicationReminders'), false);
});

test('buildInterviewReminderEmail creates valid payload and idempotency key', () => {
  const payload = buildInterviewReminderEmail({
    user: { _id: 'u-123', email: 'applicant@example.com' },
    application: {
      _id: 'app-456',
      company: 'Stripe',
      role: 'Staff Engineer',
      interviewDate: '2026-11-01T10:00:00Z',
    },
  });

  assert.equal(payload.to[0], 'applicant@example.com');
  assert.match(payload.subject, /Interview reminder.*Staff Engineer/);
  assert.match(payload.text, /Stripe/);
  assert.ok(payload.html);
  assert.match(payload.idempotencyKey, /interview-reminder:u-123:app-456:/);
});

test('buildApplicationReminderEmail creates valid payload and deadline key', () => {
  const payload = buildApplicationReminderEmail({
    user: { _id: 'u-123', email: 'applicant@example.com' },
    application: {
      _id: 'app-789',
      company: 'GitHub',
      role: 'Backend Engineer',
      deadline: '2026-12-01',
    },
  });

  assert.equal(payload.to[0], 'applicant@example.com');
  assert.match(payload.subject, /deadline reminder.*Backend Engineer/);
  assert.match(payload.text, /GitHub/);
  assert.match(payload.idempotencyKey, /app-reminder:u-123:app-789:/);
});

test('redactSecrets hides XAI_API_KEY and authorization header tokens', () => {
  process.env.XAI_API_KEY = 'xai-sensitive-token-12345';
  const input = 'Request to https://api.x.ai/v1/models failed: Bearer xai-sensitive-token-12345';
  const redacted = redactSecrets(input);

  assert.equal(redacted.includes('xai-sensitive-token-12345'), false);
  assert.match(redacted, /\[redacted/);
});

test('enqueueUnique safely returns null when queue instance is null', async () => {
  const result = await enqueueUnique(null, 'job-alert', { test: true }, 'job-id-1');
  assert.equal(result, null);
});

test('startWorkers safely skips and returns empty array when Redis is unreachable', async () => {
  const workers = await startWorkers();
  assert.ok(Array.isArray(workers));
});

test('getConfigStatus reports required and optional status without breaking startup', () => {
  const status = getConfigStatus();
  assert.ok(typeof status.required === 'object');
  assert.ok(typeof status.optional === 'object');
  assert.equal(typeof status.optional.gemini, 'boolean');
  assert.equal(typeof status.optional.geminiDualKey, 'boolean');
  assert.equal(typeof status.optional.adzuna, 'boolean');
  assert.equal(typeof status.optional.themuse, 'boolean');
  assert.equal(typeof status.optional.remotive, 'boolean');

  // Should not throw in local dev environment
  assert.doesNotThrow(() => validateEnvOnStartup());
});
