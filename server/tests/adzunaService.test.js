import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdzunaSearchUrl,
  normalizeAdzunaJob,
  hasAdzunaCredentials,
} from '../services/adzunaService.js';

test('buildAdzunaSearchUrl includes app credentials and query params', () => {
  const url = buildAdzunaSearchUrl({
    keyword: 'frontend developer',
    location: 'Remote',
    page: 2,
    limit: 10,
  });

  assert.match(url, /app_id=test-app-id/);
  assert.match(url, /app_key=test-app-key/);
  assert.match(url, /what=frontend(\+|%20)developer/);
  assert.match(url, /where=Remote/);
  assert.match(url, /\/search\/2\?/);
  assert.match(url, /results_per_page=10/);
});

test('normalizeAdzunaJob maps Adzuna results to CareerPilot job schema', () => {
  const result = {
    title: 'Senior Frontend Engineer',
    company: { display_name: 'Acme Labs' },
    description: 'Build product experiences for customers.',
    location: { display_name: 'London, UK' },
    contract_type: 'permanent',
    contract_time: 'full_time',
    created: '2024-05-01T00:00:00Z',
    redirect_url: 'https://example.com/job/1',
    salary_min: 85000,
    salary_max: 110000,
  };

  const normalized = normalizeAdzunaJob(result, 'Remote');

  assert.equal(normalized.title, 'Senior Frontend Engineer');
  assert.equal(normalized.company, 'Acme Labs');
  assert.equal(normalized.location, 'London, UK');
  assert.equal(normalized.jobType, 'Full-time');
  assert.equal(normalized.source, 'Adzuna');
  assert.equal(normalized.applyUrl, 'https://example.com/job/1');
  assert.match(normalized.salary, /£|\$/);
  assert.ok(Array.isArray(normalized.skills));
});

test('hasAdzunaCredentials returns true only when both values are present', () => {
  assert.equal(hasAdzunaCredentials({ appId: 'abc', appKey: 'def' }), true);
  assert.equal(hasAdzunaCredentials({ appId: '', appKey: 'def' }), false);
  assert.equal(hasAdzunaCredentials({ appId: 'abc', appKey: '' }), false);
});
