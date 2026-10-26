import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmailPayload, buildJobAlertEmail, isValidEmail } from '../services/email/resendService.js';
import { createOAuthState, verifyOAuthState } from '../services/calendar/googleCalendarService.js';
import { encryptSecret, decryptSecret } from '../utils/tokenCrypto.js';
import { redactSecrets } from '../utils/redact.js';

test('email payload generation validates recipient and does not send', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  const payload = buildEmailPayload({
    to: 'tester@example.com',
    subject: 'Interview reminder',
    text: 'Your interview is coming up.',
    idempotencyKey: 'interview:user:1',
  });
  assert.deepEqual(payload.to, ['tester@example.com']);
  assert.equal(payload.subject, 'Interview reminder');
  assert.ok(payload.from);
});

test('job alert email is idempotent per user/day key', () => {
  const payload = buildJobAlertEmail({
    user: { _id: 'user-1', email: 'tester@example.com' },
    jobs: [{ title: 'Engineer', company: 'Acme' }],
  });
  assert.match(payload.idempotencyKey, /job-alert:user-1:/);
  assert.match(payload.text, /Engineer at Acme/);
});

test('Google OAuth state must match the cookie and reject mismatches', () => {
  const state = createOAuthState('user-42');
  const valid = verifyOAuthState(state, 'user-42', state);
  assert.equal(valid.valid, true);

  const mismatch = verifyOAuthState(state, 'user-42', 'other-state');
  assert.equal(mismatch.valid, false);

  const userMismatch = verifyOAuthState(state, 'someone-else', state);
  assert.equal(userMismatch.valid, false);
});

test('token encryption round-trips and redaction hides secret-shaped values', () => {
  const encrypted = encryptSecret('refresh-token-value');
  assert.notEqual(encrypted, 'refresh-token-value');
  assert.equal(decryptSecret(encrypted), 'refresh-token-value');

  const redacted = redactSecrets('Authorization Bearer abc.def and app_key=supersecret');
  assert.equal(redacted.includes('supersecret'), false);
  assert.equal(redacted.includes('abc.def'), false);
});
