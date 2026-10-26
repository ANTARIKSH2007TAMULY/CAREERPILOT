import test from 'node:test';
import assert from 'node:assert/strict';
import GeminiKeyManager from '../services/ai/geminiKeyManager.js';
import GeminiProvider from '../services/ai/geminiProvider.js';
import {
  reserveQuota,
  reconcileUsage,
  releaseReservation,
  getUserUsageSummary,
  clearTestUsageStore,
  validateInputSize,
  estimateTokens,
  getUtcKeys,
  QuotaExceededError,
  DatabaseUnavailableError,
} from '../services/ai/aiQuotaService.js';
import env from '../config/env.js';

test('GeminiKeyManager: primary key succeeds and secondary key is not called', async () => {
  let primaryCalls = 0;
  let secondaryCalls = 0;

  const km = new GeminiKeyManager({
    primaryKey: 'mock-primary-key',
    secondaryKey: 'mock-secondary-key',
  });

  assert.equal(km.isConfigured(), true);
  assert.equal(km.hasDualKeys(), true);

  const result = await km.executeWithFailover(async (key, keyId) => {
    if (keyId === 'primary') {
      primaryCalls++;
      return { text: 'Primary success', keyUsed: keyId };
    }
    secondaryCalls++;
    return { text: 'Secondary success', keyUsed: keyId };
  });

  assert.equal(result.text, 'Primary success');
  assert.equal(result.keyUsed, 'primary');
  assert.equal(primaryCalls, 1);
  assert.equal(secondaryCalls, 0);
});

test('GeminiKeyManager: secondary key used after eligible primary failure (HTTP 429 quota/rate limit)', async () => {
  let primaryCalls = 0;
  let secondaryCalls = 0;

  const km = new GeminiKeyManager({
    primaryKey: 'mock-primary-key',
    secondaryKey: 'mock-secondary-key',
  });

  const result = await km.executeWithFailover(async (key, keyId) => {
    if (keyId === 'primary') {
      primaryCalls++;
      const err = new Error('429 Resource has been exhausted (quota limit)');
      err.status = 429;
      throw err;
    }
    secondaryCalls++;
    return { text: 'Secondary handled failover', keyUsed: keyId };
  });

  assert.equal(result.text, 'Secondary handled failover');
  assert.equal(result.keyUsed, 'secondary');
  assert.equal(primaryCalls, 1);
  assert.equal(secondaryCalls, 1);

  // Status should reflect primary key in cooldown and failover recorded
  const status = km.getStatus();
  assert.equal(status.failoverCount, 1);
  assert.equal(status.keys.primary.status, 'cooldown');
});

test('GeminiKeyManager: secondary key used after temporary HTTP 503 high demand', async () => {
  let primaryCalls = 0;
  let secondaryCalls = 0;

  const km = new GeminiKeyManager({
    primaryKey: 'mock-primary-key',
    secondaryKey: 'mock-secondary-key',
  });

  const result = await km.executeWithFailover(async (key, keyId) => {
    if (keyId === 'primary') {
      primaryCalls++;
      const err = new Error('503 Service Unavailable (The model is overloaded)');
      err.status = 503;
      throw err;
    }
    secondaryCalls++;
    return { text: 'Secondary salvaged 503', keyUsed: keyId };
  });

  assert.equal(result.text, 'Secondary salvaged 503');
  assert.equal(primaryCalls, 1);
  assert.equal(secondaryCalls, 1);
});

test('GeminiKeyManager: both keys missing reports isConfigured false and rejects', async () => {
  const km = new GeminiKeyManager({
    primaryKey: '',
    secondaryKey: '',
  });

  assert.equal(km.isConfigured(), false);
  assert.equal(km.hasDualKeys(), false);

  await assert.rejects(
    async () => {
      km.getActiveKey();
    },
    /No valid Gemini API keys configured/
  );
});

test('GeminiKeyManager: both keys failing throws error without infinite loop', async () => {
  const km = new GeminiKeyManager({
    primaryKey: 'primary-key',
    secondaryKey: 'secondary-key',
  });

  let attempts = 0;
  await assert.rejects(
    async () => {
      await km.executeWithFailover(async (key, keyId) => {
        attempts++;
        const err = new Error(`500 Internal error from ${keyId}`);
        err.status = 500;
        throw err;
      });
    },
    /All configured Gemini API keys failed/
  );

  // Exactly 2 attempts (one for primary, one for secondary)
  assert.equal(attempts, 2);
});

test('GeminiKeyManager: HTTP 400 invalid client request does NOT fail over to second key', async () => {
  let primaryCalls = 0;
  let secondaryCalls = 0;

  const km = new GeminiKeyManager({
    primaryKey: 'primary-key',
    secondaryKey: 'secondary-key',
  });

  await assert.rejects(
    async () => {
      await km.executeWithFailover(async (key, keyId) => {
        if (keyId === 'primary') {
          primaryCalls++;
          const err = new Error('400 Bad Request: Invalid JSON in request body');
          err.status = 400;
          throw err;
        }
        secondaryCalls++;
        return { text: 'should not reach' };
      });
    },
    /400 Bad Request/
  );

  // Secondary key must not be wasted on a client-side invalid payload
  assert.equal(primaryCalls, 1);
  assert.equal(secondaryCalls, 0);
});

test('GeminiKeyManager: HTTP 401/403 invalid credentials permanently invalidates key without retries', async () => {
  let primaryCalls = 0;
  let secondaryCalls = 0;

  const km = new GeminiKeyManager({
    primaryKey: 'bad-key',
    secondaryKey: 'good-key',
  });

  const result = await km.executeWithFailover(async (key, keyId) => {
    if (keyId === 'primary') {
      primaryCalls++;
      const err = new Error('401 API_KEY_INVALID: API key not valid');
      err.status = 401;
      throw err;
    }
    secondaryCalls++;
    return { text: 'Good key worked' };
  });

  assert.equal(result.text, 'Good key worked');
  assert.equal(primaryCalls, 1);
  assert.equal(secondaryCalls, 1);

  // Primary key must be marked permanently invalid
  const status = km.getStatus();
  assert.equal(status.keys.primary.status, 'invalid');
  assert.equal(status.keys.primary.isPermanentlyInvalid, true);

  // Subsequent call should skip primary immediately and use secondary directly
  primaryCalls = 0;
  secondaryCalls = 0;
  await km.executeWithFailover(async (key, keyId) => {
    if (keyId === 'primary') primaryCalls++;
    if (keyId === 'secondary') secondaryCalls++;
    return { text: 'ok' };
  });
  assert.equal(primaryCalls, 0);
  assert.equal(secondaryCalls, 1);
});

test('Quota: Database unavailable fails closed for AI features', async () => {
  // When MongoDB is disconnected and allowTestMock is false (default), reserveQuota must fail closed
  await assert.rejects(
    async () => {
      await reserveQuota({
        user: { _id: 'user-db-offline-123' },
        feature: 'coach',
        inputText: 'Hello coach',
        allowTestMock: false,
      });
    },
    (err) => {
      assert.equal(err instanceof DatabaseUnavailableError, true);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'DATABASE_UNAVAILABLE_AI_FAIL_CLOSED');
      return true;
    }
  );
});

test('Quota: Input size validation rejects oversized payloads with 400', () => {
  assert.throws(
    () => {
      // 6000 tokens limit * 4 = 24,000 characters
      const oversizedText = 'a'.repeat(25000);
      validateInputSize(oversizedText, 6000);
    },
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'AI_INPUT_TOO_LARGE');
      return true;
    }
  );
});

test('Quota: Rate limit per minute enforced (5 requests/minute)', async () => {
  clearTestUsageStore();
  const testUser = { _id: 'user-rate-limit-1' };

  // Make 5 requests (the limit)
  for (let i = 0; i < env.aiRateLimitPerMinute; i++) {
    const reservation = await reserveQuota({
      user: testUser,
      feature: 'coach',
      inputText: `Question ${i}`,
      allowTestMock: true,
    });
    assert.ok(reservation.reservationId);
    await reconcileUsage(reservation.reservationId, { totalTokens: 100 });
  }

  // 6th request must throw 429 AI_RATE_LIMIT_EXCEEDED
  await assert.rejects(
    async () => {
      await reserveQuota({
        user: testUser,
        feature: 'coach',
        inputText: 'Question 6',
        allowTestMock: true,
      });
    },
    (err) => {
      assert.equal(err instanceof QuotaExceededError, true);
      assert.equal(err.status, 429);
      assert.equal(err.code, 'AI_RATE_LIMIT_EXCEEDED');
      assert.ok(err.retryAfterSeconds > 0);
      assert.ok(err.resetsAt);
      return true;
    }
  );
});

test('Quota: Daily request limit enforced (20 requests/day)', async () => {
  clearTestUsageStore();
  const testUser = { _id: 'user-daily-limit-1' };

  const baseTime = Date.now();
  for (let i = 0; i < env.aiDailyRequestLimit; i++) {
    const reservation = await reserveQuota({
      user: testUser,
      feature: 'coach',
      inputText: `Daily req ${i}`,
      timestamp: new Date(baseTime + i * 70000),
      allowTestMock: true,
    });
    // Complete the reservation
    await reconcileUsage(reservation.reservationId, { totalTokens: 50 });
  }

  // 21st request must reject with AI_DAILY_REQUEST_LIMIT_EXCEEDED
  await assert.rejects(
    async () => {
      await reserveQuota({
        user: testUser,
        feature: 'coach',
        inputText: 'Daily req 21',
        timestamp: new Date(baseTime + 21 * 70000),
        allowTestMock: true,
      });
    },
    (err) => {
      assert.equal(err instanceof QuotaExceededError, true);
      assert.equal(err.status, 429);
      assert.equal(err.code, 'AI_DAILY_REQUEST_LIMIT_EXCEEDED');
      assert.ok(err.resetsAt);
      return true;
    }
  );
});

test('Quota: Concurrent requests limit blocks parallel in-flight abuse', async () => {
  clearTestUsageStore();
  const testUser = { _id: 'user-concurrent-1' };

  // Reserve 2 requests (without completing or releasing them)
  const res1 = await reserveQuota({
    user: testUser,
    feature: 'coach',
    inputText: 'In-flight 1',
    allowTestMock: true,
  });
  const res2 = await reserveQuota({
    user: testUser,
    feature: 'coach',
    inputText: 'In-flight 2',
    allowTestMock: true,
  });

  assert.ok(res1.reservationId);
  assert.ok(res2.reservationId);

  // 3rd concurrent attempt must be rejected
  await assert.rejects(
    async () => {
      await reserveQuota({
        user: testUser,
        feature: 'coach',
        inputText: 'In-flight 3',
        allowTestMock: true,
      });
    },
    (err) => {
      assert.equal(err.status, 429);
      assert.equal(err.code, 'AI_CONCURRENT_LIMIT_EXCEEDED');
      return true;
    }
  );

  // Once res1 is reconciled or released, a new request is permitted
  await releaseReservation(res1.reservationId, 'failed');
  const res3 = await reserveQuota({
    user: testUser,
    feature: 'coach',
    inputText: 'In-flight 3 retry',
    allowTestMock: true,
  });
  assert.ok(res3.reservationId);
});

test('Quota: Token reservation and reconciliation safely adjusts active usage', async () => {
  clearTestUsageStore();
  const testUser = { _id: 'user-tokens-1' };

  const promptText = 'What skills should I learn for distributed systems engineering?';
  const estimated = estimateTokens(promptText);
  assert.ok(estimated > 2000); // 2000 output budget + prompt tokens

  const reservation = await reserveQuota({
    user: testUser,
    feature: 'coach',
    inputText: promptText,
    allowTestMock: true,
  });

  assert.equal(reservation.estimatedTokens, estimated);

  // Reconcile with actual provider usage (say 450 total tokens)
  const reconciled = await reconcileUsage(reservation.reservationId, {
    inputTokens: 50,
    outputTokens: 400,
    totalTokens: 450,
    durationMs: 320,
    model: 'gemini-3.5-flash-lite',
    keyUsed: 'primary',
  });

  assert.equal(reconciled.status, 'completed');
  assert.equal(reconciled.totalTokens, 450);

  // Check summary
  const summary = await getUserUsageSummary(testUser._id);
  assert.equal(summary.daily.requestsUsed, 1);
  assert.equal(summary.daily.tokensUsed, 450);
});

test('Quota: User A cannot consume or inspect User B quota (strict isolation)', async () => {
  clearTestUsageStore();
  const userA = { _id: 'user-alice' };
  const userB = { _id: 'user-bob' };

  // User A consumes 3 requests
  for (let i = 0; i < 3; i++) {
    const res = await reserveQuota({
      user: userA,
      feature: 'coach',
      inputText: `Alice Q${i}`,
      allowTestMock: true,
    });
    await reconcileUsage(res.reservationId, { totalTokens: 200 });
  }

  // Summary for Alice
  const summaryA = await getUserUsageSummary(userA._id);
  assert.equal(summaryA.daily.requestsUsed, 3);
  assert.equal(summaryA.daily.tokensUsed, 600);

  // Summary for Bob must be completely untouched
  const summaryB = await getUserUsageSummary(userB._id);
  assert.equal(summaryB.daily.requestsUsed, 0);
  assert.equal(summaryB.daily.tokensUsed, 0);
  assert.equal(summaryB.daily.requestsRemaining, env.aiDailyRequestLimit);
});

test('Quota: Usage summary provides UTC reset timestamps and hides all secrets', async () => {
  clearTestUsageStore();
  const testUser = { _id: 'user-secrets-check' };

  const summary = await getUserUsageSummary(testUser._id);

  assert.ok(summary.daily.resetsAt.endsWith('Z')); // UTC ISO
  assert.ok(summary.monthly.resetsAt.endsWith('Z')); // UTC ISO
  assert.equal(summary.daily.requestLimit, env.aiDailyRequestLimit);
  assert.equal(summary.monthly.requestLimit, env.aiMonthlyRequestLimit);

  // Ensure absolutely no API keys or sensitive authorization tokens in payload
  const jsonStr = JSON.stringify(summary);
  assert.equal(jsonStr.includes('primaryKey'), false);
  assert.equal(jsonStr.includes('secondaryKey'), false);
  assert.equal(jsonStr.includes('AQ.'), false);
  assert.equal(jsonStr.includes('xai-'), false);
  assert.equal(jsonStr.includes('Bearer'), false);
});
