import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAdzunaCredentials, buildAdzunaSearchUrl } from '../services/adzunaService.js';

test('legacy Adzuna helpers remain exported', () => {
  assert.equal(hasAdzunaCredentials({ appId: 'a', appKey: 'b' }), true);
  const url = buildAdzunaSearchUrl({ keyword: 'react', page: 1, limit: 5 });
  assert.match(url, /\/search\/1\?/);
  assert.match(url, /results_per_page=5/);
});
