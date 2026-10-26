import env from '../../config/env.js';
import { safeErrorMessage } from '../../utils/redact.js';

class GeminiKeyManager {
  constructor({
    primaryKey = env.geminiApiKey,
    secondaryKey = env.geminiApiKey2,
    cooldownMs429 = 60000,
    cooldownMs5xx = 30000,
    maxConsecutiveFailures = 2,
  } = {}) {
    this.keys = [];
    this.failoverCount = 0;

    const pk = String(primaryKey || '').trim();
    if (pk) {
      this.keys.push({
        id: 'primary',
        key: pk,
        status: 'active', // 'active' | 'cooldown' | 'invalid'
        consecutiveFailures: 0,
        cooldownUntil: 0,
        lastFailureReason: null,
        successCount: 0,
        failureCount: 0,
        isPermanentlyInvalid: false,
      });
    }

    const sk = String(secondaryKey || '').trim();
    if (sk && sk !== pk) {
      this.keys.push({
        id: 'secondary',
        key: sk,
        status: 'active',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        lastFailureReason: null,
        successCount: 0,
        failureCount: 0,
        isPermanentlyInvalid: false,
      });
    }

    this.cooldownMs429 = cooldownMs429;
    this.cooldownMs5xx = cooldownMs5xx;
    this.maxConsecutiveFailures = maxConsecutiveFailures;
  }

  isConfigured() {
    return this.keys.some((k) => k.status !== 'invalid');
  }

  hasDualKeys() {
    return this.keys.filter((k) => k.status !== 'invalid').length >= 2;
  }

  getActiveKeyInfo(preferredIndex = 0) {
    const now = Date.now();

    // Check if any cooldowns have expired
    for (const k of this.keys) {
      if (k.status === 'cooldown' && k.cooldownUntil <= now) {
        k.status = 'active';
        k.cooldownUntil = 0;
      }
    }

    const activeKeys = this.keys.filter((k) => k.status === 'active');
    if (activeKeys.length === 0) {
      // If all active keys are in cooldown, pick the one with earliest cooldown expiry
      const cooldownKeys = this.keys.filter((k) => k.status === 'cooldown');
      if (cooldownKeys.length > 0) {
        cooldownKeys.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
        return cooldownKeys[0];
      }
      return null;
    }

    // Default to primary if active
    if (preferredIndex < activeKeys.length) {
      return activeKeys[preferredIndex];
    }
    return activeKeys[0];
  }

  getActiveKey() {
    const keyInfo = this.getActiveKeyInfo();
    if (!keyInfo) {
      throw new Error('No valid Gemini API keys configured or available.');
    }
    return keyInfo.key;
  }

  getStatus() {
    const keysMap = {};
    for (const k of this.keys) {
      keysMap[k.id] = {
        status: k.status,
        consecutiveFailures: k.consecutiveFailures,
        successCount: k.successCount,
        failureCount: k.failureCount,
        isPermanentlyInvalid: k.isPermanentlyInvalid || k.status === 'invalid',
        cooldownUntil: k.cooldownUntil,
      };
    }

    return {
      isConfigured: this.isConfigured(),
      hasDualKeys: this.hasDualKeys(),
      failoverCount: this.failoverCount,
      keys: keysMap,
    };
  }

  recordSuccess(keyObj) {
    if (!keyObj) return;
    keyObj.status = 'active';
    keyObj.consecutiveFailures = 0;
    keyObj.cooldownUntil = 0;
    keyObj.successCount += 1;
  }

  recordFailure(keyObj, error) {
    if (!keyObj) return { retryable: false, failoverEligible: false };
    keyObj.failureCount += 1;
    keyObj.consecutiveFailures += 1;

    const msg = safeErrorMessage(error);
    keyObj.lastFailureReason = msg;
    const now = Date.now();

    // 1. Permanent Authentication / Permission Error (401 / 403 / API key not valid)
    if (
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('API key not valid') ||
      msg.includes('PERMISSION_DENIED')
    ) {
      keyObj.status = 'invalid';
      keyObj.isPermanentlyInvalid = true;
      console.warn(`[GeminiKeyManager] Key ${keyObj.id} marked INVALID due to credential/permission failure.`);
      return { retryable: false, failoverEligible: true };
    }

    // 2. Client-side Bad Request (400) - Non-retryable, not a key issue
    if (msg.includes('400') && !msg.includes('API key')) {
      return { retryable: false, failoverEligible: false };
    }

    // 3. Quota Exceeded / Rate Limit (429)
    if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
      keyObj.status = 'cooldown';
      keyObj.cooldownUntil = now + this.cooldownMs429;
      console.warn(`[GeminiKeyManager] Key ${keyObj.id} rate-limited (429). Placed on cooldown for ${this.cooldownMs429 / 1000}s.`);
      return { retryable: true, failoverEligible: true };
    }

    // 4. Server Errors (500, 502, 503, 504) or Network Timeout
    if (
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('timeout') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ETIMEDOUT')
    ) {
      if (keyObj.consecutiveFailures >= this.maxConsecutiveFailures) {
        keyObj.status = 'cooldown';
        keyObj.cooldownUntil = now + this.cooldownMs5xx;
        console.warn(`[GeminiKeyManager] Key ${keyObj.id} transient failure spike (${keyObj.consecutiveFailures}x). Placed on cooldown for ${this.cooldownMs5xx / 1000}s.`);
      }
      return { retryable: true, failoverEligible: true };
    }

    return { retryable: false, failoverEligible: false };
  }

  async executeWithFailover(operation) {
    if (!this.isConfigured()) return null;

    const attemptedKeys = new Set();
    const candidateKeys = [...this.keys].filter((k) => k.status !== 'invalid');
    let lastError = null;

    for (let attempt = 0; attempt < candidateKeys.length; attempt += 1) {
      // Find next candidate key not yet attempted in this request
      const keyObj = candidateKeys.find(
        (k) => !attemptedKeys.has(k.id) && (k.status === 'active' || candidateKeys.length === 1)
      ) || candidateKeys.find((k) => !attemptedKeys.has(k.id));

      if (!keyObj) break;
      attemptedKeys.add(keyObj.id);

      try {
        const result = await operation(keyObj.key, keyObj.id);
        if (result) {
          this.recordSuccess(keyObj);
          return {
            ...result,
            keyUsed: keyObj.id,
          };
        }
      } catch (err) {
        lastError = err;
        const { retryable, failoverEligible } = this.recordFailure(keyObj, err);

        // If non-retryable and not eligible for failover (e.g. 400 Bad Request), throw immediately
        if (!retryable && !failoverEligible) {
          throw err;
        }

        // If eligible for failover and another key is available, failover
        const remainingCandidates = candidateKeys.filter((k) => !attemptedKeys.has(k.id) && k.status !== 'invalid');
        if (failoverEligible && remainingCandidates.length > 0) {
          this.failoverCount += 1;
          console.warn(`[GeminiKeyManager] Failing over from ${keyObj.id} to ${remainingCandidates[0].id}...`);
          const jitterMs = Math.floor(Math.random() * 200) + 100;
          await new Promise((resolve) => setTimeout(resolve, jitterMs));
          continue;
        }
      }
    }

    if (lastError) {
      const err = new Error(`All configured Gemini API keys failed: ${lastError.message}`);
      err.originalError = lastError;
      throw err;
    }

    return null;
  }
}

export default GeminiKeyManager;
