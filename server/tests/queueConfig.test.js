import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkerNames } from '../queues/workers.js';

test('queue names cover current feature set', () => {
  assert.deepEqual(getWorkerNames(), ['jobSyncQueue', 'aiQueue', 'notificationQueue']);
});
