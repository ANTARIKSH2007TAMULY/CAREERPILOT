import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeJobs, normalizeJobRecord } from '../services/jobs/jobSchema.js';
import { normalizeMuseJob } from '../services/jobs/theMuseService.js';
import { normalizeRemotiveJob } from '../services/jobs/remotiveService.js';
import { normalizeAdzunaJob } from '../services/adzunaService.js';

test('normalizeJobRecord drops jobs without a listing URL', () => {
  const result = normalizeJobRecord({
    provider: 'Adzuna',
    title: 'Engineer',
    company: 'Acme',
  });
  assert.equal(result, null);
});

test('normalizeAdzunaJob maps provider fields without inventing skills or currency', () => {
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
  assert.equal(normalized.source, 'Adzuna');
  assert.equal(normalized.providerJobId, '99');
  assert.equal(normalized.jobType, 'Full-time');
  assert.equal(normalized.experienceLevel, 'Senior');
  assert.deepEqual(normalized.skills, []);
  assert.match(normalized.salary, /85,000/);
  assert.equal(normalized.salary.includes('£') || normalized.salary.includes('$'), false);
});

test('normalizeMuseJob preserves The Muse listing URL and company', () => {
  const normalized = normalizeMuseJob({
    id: 42,
    name: 'Platform Engineer',
    contents: '<p>Ship reliable services.</p>',
    publication_date: '2024-01-15T00:00:00Z',
    locations: [{ name: 'Flexible / Remote' }],
    categories: [{ name: 'Software Engineering' }],
    levels: [{ name: 'Mid Level' }],
    refs: { landing_page: 'https://www.themuse.com/jobs/example/42' },
    company: { name: 'Muse Co', short_name: 'museco' },
  });

  assert.equal(normalized.source, 'The Muse');
  assert.equal(normalized.company, 'Muse Co');
  assert.equal(normalized.applyUrl, 'https://www.themuse.com/jobs/example/42');
  assert.equal(normalized.workMode, 'Remote');
  assert.equal(normalized.experienceLevel, 'Mid');
  assert.deepEqual(normalized.skills, ['Software Engineering']);
});

test('normalizeRemotiveJob keeps attribution and original listing URL', () => {
  const normalized = normalizeRemotiveJob({
    id: 123,
    url: 'https://remotive.com/remote-jobs/software-dev/lead-developer-123',
    title: 'Lead Developer',
    company_name: 'Remotive',
    company_logo: 'https://remotive.com/job/123/logo',
    category: 'Software Development',
    job_type: 'full_time',
    publication_date: '2020-02-15T10:23:26',
    candidate_required_location: 'Worldwide',
    salary: '$80k - $100k',
    description: 'Build community tools.',
    tags: ['javascript'],
  });

  assert.equal(normalized.source, 'Remotive');
  assert.equal(normalized.workMode, 'Remote');
  assert.equal(normalized.applyUrl, 'https://remotive.com/remote-jobs/software-dev/lead-developer-123');
  assert.equal(normalized.salary, '$80k - $100k');
  assert.equal(normalized.metadata.attribution, 'Jobs by Remotive');
});

test('dedupeJobs uses provider IDs first and does not merge distinct titles', () => {
  const jobs = [
    { source: 'Adzuna', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://a.example/1' },
    { source: 'Adzuna', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://a.example/1' },
    { source: 'The Muse', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://m.example/1' },
    { source: 'Remotive', providerJobId: '9', title: 'Designer', company: 'Acme', sourceUrl: 'https://r.example/9' },
  ];

  const unique = dedupeJobs(jobs);
  assert.equal(unique.length, 3);
  assert.equal(unique.filter((job) => job.title === 'Engineer').length, 2);
});
