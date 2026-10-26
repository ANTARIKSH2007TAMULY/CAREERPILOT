import test from 'node:test';
import assert from 'node:assert/strict';

import { dedupeJobs, normalizeJobRecord } from '../services/jobs/jobSchema.js';
import { normalizeAdzunaJob, hasAdzunaCredentials, buildAdzunaSearchUrl } from '../services/adzunaService.js';
import { normalizeMuseJob, buildMuseSearchUrl } from '../services/jobs/theMuseService.js';
import { normalizeRemotiveJob, REMOTIVE_ATTRIBUTION } from '../services/jobs/remotiveService.js';
import { searchAggregatedJobs } from '../services/jobs/jobAggregator.js';
import { redactSecrets } from '../utils/redact.js';
import { validateJobMatch } from '../services/ai/aiSchemas.js';
import { buildEmailPayload, buildJobAlertEmail } from '../services/email/resendService.js';
import { createOAuthState, verifyOAuthState } from '../services/calendar/googleCalendarService.js';

test('buildAdzunaSearchUrl includes query params', () => {
  const url = buildAdzunaSearchUrl({
    keyword: 'frontend developer',
    location: 'Remote',
    page: 2,
    limit: 10,
  });

  assert.match(url, /app_id=/);
  assert.match(url, /app_key=/);
  assert.match(url, /what=frontend(\+|%20)developer/);
  assert.match(url, /where=Remote/);
  assert.match(url, /\/search\/2\?/);
  assert.match(url, /results_per_page=10/);
});

test('normalizeAdzunaJob maps Adzuna results without inventing skills', () => {
  const normalized = normalizeAdzunaJob({
    id: 99,
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
  });

  assert.equal(normalized.title, 'Senior Frontend Engineer');
  assert.equal(normalized.company, 'Acme Labs');
  assert.equal(normalized.location, 'London, UK');
  assert.equal(normalized.jobType, 'Full-time');
  assert.equal(normalized.source, 'Adzuna');
  assert.equal(normalized.providerJobId, '99');
  assert.equal(normalized.applyUrl, 'https://example.com/job/1');
  assert.match(normalized.salary, /85[,.]?000/);
  assert.deepEqual(normalized.skills, []);
});

test('hasAdzunaCredentials returns true only when both values are present', () => {
  assert.equal(hasAdzunaCredentials({ appId: 'abc', appKey: 'def' }), true);
  assert.equal(hasAdzunaCredentials({ appId: '', appKey: 'def' }), false);
  assert.equal(hasAdzunaCredentials({ appId: 'abc', appKey: '' }), false);
});

test('normalizeJobRecord drops jobs missing listing URLs', () => {
  assert.equal(
    normalizeJobRecord({
      provider: 'Adzuna',
      title: 'Engineer',
      company: 'Acme',
    }),
    null
  );
});

test('The Muse and Remotive normalizers preserve source URLs and attribution', () => {
  const muse = normalizeMuseJob({
    id: 12,
    name: 'Data Analyst',
    contents: '<p>Analyze product data</p>',
    publication_date: '2024-01-01T00:00:00Z',
    locations: [{ name: 'Flexible / Remote' }],
    categories: [{ name: 'Data Science' }],
    levels: [{ name: 'Entry Level' }],
    refs: { landing_page: 'https://www.themuse.com/jobs/example/12' },
    company: { name: 'Muse Co' },
  });

  assert.equal(muse.source, 'The Muse');
  assert.equal(muse.applyUrl, 'https://www.themuse.com/jobs/example/12');
  assert.equal(muse.workMode, 'Remote');
  assert.equal(muse.experienceLevel, 'Entry');
  assert.deepEqual(muse.skills, ['Data Science']);

  const remotive = normalizeRemotiveJob({
    id: 44,
    url: 'https://remotive.com/remote-jobs/software-dev/engineer-44',
    title: 'Backend Engineer',
    company_name: 'Remotive',
    description: 'Build APIs',
    candidate_required_location: 'Worldwide',
    job_type: 'full_time',
    publication_date: '2024-02-01T00:00:00',
    salary: '$90k - $110k',
    tags: ['Python'],
  });

  assert.equal(remotive.source, 'Remotive');
  assert.equal(remotive.workMode, 'Remote');
  assert.equal(remotive.applyUrl, 'https://remotive.com/remote-jobs/software-dev/engineer-44');
  assert.equal(remotive.metadata.attribution, REMOTIVE_ATTRIBUTION);
  assert.equal(remotive.salary, '$90k - $110k');
});

test('dedupe uses provider IDs and does not merge distinct titles', () => {
  const jobs = [
    { source: 'Adzuna', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://a.example/1' },
    { source: 'Adzuna', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://a.example/1' },
    { source: 'The Muse', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://m.example/1' },
    { source: 'Remotive', providerJobId: '9', title: 'Designer', company: 'Acme', sourceUrl: 'https://r.example/9' },
  ];

  const unique = dedupeJobs(jobs);
  assert.equal(unique.length, 3);
});

test('aggregator continues when one provider fails', async () => {
  const originalFetch = globalThis.fetch;
  const result = await searchAggregatedJobs({
    keyword: 'developer',
    source: 'missing-provider',
    page: 1,
    limit: 5,
  });
  assert.ok(Array.isArray(result.jobs));
  assert.ok(Array.isArray(result.providers));
  globalThis.fetch = originalFetch;
});

test('Muse search URL is 0-indexed and can omit api_key', () => {
  const url = buildMuseSearchUrl({ keyword: 'react', location: 'New York, NY', page: 2, apiKey: '' });
  assert.match(url, /page=1/);
  assert.doesNotMatch(url, /api_key=/);
});

test('AI schema validation rejects fabricated incomplete payloads', () => {
  assert.equal(validateJobMatch({ summary: 'great fit' }), null);
  const valid = validateJobMatch({
    matchScore: 80,
    strengths: ['React'],
    missingSkills: ['Go'],
    recommendations: ['Practice Go'],
    summary: 'Solid overlap',
  });
  assert.equal(valid.matchScore, 80);
  assert.equal(valid.generatedByAI, true);
});

test('email payload generation does not send mail', () => {
  const payload = buildJobAlertEmail({
    user: { _id: 'u1', email: 'person@example.com' },
    jobs: [{ title: 'Engineer', company: 'Acme' }],
  });
  assert.equal(payload.to[0], 'person@example.com');
  assert.match(payload.subject, /digest/i);
  assert.throws(() => buildEmailPayload({ to: 'not-an-email', subject: 'Hi', text: 'Hello' }));
});

test('Google OAuth state validation rejects mismatches', () => {
  const state = createOAuthState('user-1');
  assert.equal(verifyOAuthState(state, 'user-1', state).valid, true);
  assert.equal(verifyOAuthState(state, 'user-2', state).valid, false);
  assert.equal(verifyOAuthState(state, 'user-1', 'other').valid, false);
});

test('safe logging redacts secret-like values', () => {
  const previous = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_dummy_key_value';
  const redacted = redactSecrets('failed re_test_dummy_key_value app_key=supersecret');
  assert.doesNotMatch(redacted, /re_test_dummy_key_value/);
  assert.doesNotMatch(redacted, /supersecret/);
  process.env.RESEND_API_KEY = previous;
});
