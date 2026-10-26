import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseVerifiedPostingDate,
  getThirtyDaysWindow,
  isJobPostedWithinLast30Days,
  filterJobsByLast30Days,
  buildMongo30DaysDateFilter,
  THIRTY_DAYS_MS,
  DEFAULT_CLOCK_SKEW_TOLERANCE_MS,
} from '../services/jobs/jobDateUtils.js';

import { normalizeAdzunaJob } from '../services/adzunaService.js';
import { normalizeMuseJob } from '../services/jobs/theMuseService.js';
import {
  normalizeRemotiveJob,
  interpretRemotivePayload,
  remotiveIngestionMessage,
  buildRemotiveSearchUrl,
} from '../services/jobs/remotiveService.js';
import { dedupeJobs, normalizeJobRecord } from '../services/jobs/jobSchema.js';
import { ingestionManager } from '../services/jobs/ingestionManager.js';
import { sortJobs, matchesFilters } from '../controllers/jobController.js';

test('parseVerifiedPostingDate: parses valid ISO date strings and Date instances', () => {
  const isoStr = '2026-10-24T12:00:00.000Z';
  const parsed = parseVerifiedPostingDate(isoStr);
  assert.ok(parsed instanceof Date);
  assert.equal(parsed.toISOString(), isoStr);

  const dateObj = new Date('2026-10-20T08:30:00.000Z');
  assert.equal(parseVerifiedPostingDate(dateObj).getTime(), dateObj.getTime());
});

test('parseVerifiedPostingDate: rejects invalid, missing, empty, or fabricated dates', () => {
  assert.equal(parseVerifiedPostingDate(null), null);
  assert.equal(parseVerifiedPostingDate(undefined), null);
  assert.equal(parseVerifiedPostingDate(''), null);
  assert.equal(parseVerifiedPostingDate('   '), null);
  assert.equal(parseVerifiedPostingDate('not-a-date'), null);
  assert.equal(parseVerifiedPostingDate('Invalid Date'), null);
  assert.equal(parseVerifiedPostingDate(true), null);
  assert.equal(parseVerifiedPostingDate(false), null);
  assert.equal(parseVerifiedPostingDate({}), null);
});

test('30-day cutoff: job posted today is included', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const postedToday = new Date('2026-10-25T10:00:00.000Z');
  assert.equal(isJobPostedWithinLast30Days(postedToday, { referenceTime: now }), true);
});

test('30-day cutoff: job posted exactly at the 30-day cutoff boundary is included', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const exactCutoff = new Date(now - THIRTY_DAYS_MS);
  assert.equal(isJobPostedWithinLast30Days(exactCutoff, { referenceTime: now }), true);
});

test('30-day cutoff: job posted 31 days ago is excluded', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const thirtyOneDaysAgo = new Date(now - 31 * 24 * 60 * 60 * 1000);
  assert.equal(isJobPostedWithinLast30Days(thirtyOneDaysAgo, { referenceTime: now }), false);
});

test('30-day cutoff: job with missing or invalid date is excluded', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  assert.equal(isJobPostedWithinLast30Days({ title: 'No Date Job' }, { referenceTime: now }), false);
  assert.equal(isJobPostedWithinLast30Days({ title: 'Invalid Date Job', postedAt: 'invalid' }, { referenceTime: now }), false);
  assert.equal(isJobPostedWithinLast30Days({ title: 'Null Date Job', postedAt: null }, { referenceTime: now }), false);
});

test('Clock-skew tolerance: future-dated job within tolerance is accepted, beyond is excluded', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const withinTolerance = new Date(now + 15 * 60 * 1000); // +15 mins
  const beyondTolerance = new Date(now + DEFAULT_CLOCK_SKEW_TOLERANCE_MS + 60 * 1000); // +4h 1m

  assert.equal(isJobPostedWithinLast30Days(withinTolerance, { referenceTime: now }), true);
  assert.equal(isJobPostedWithinLast30Days(beyondTolerance, { referenceTime: now }), false);
});

test('buildMongo30DaysDateFilter generates valid Date boundary query', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const filter = buildMongo30DaysDateFilter(now);

  assert.ok(filter.postedAt);
  assert.ok(filter.postedAt.$gte instanceof Date);
  assert.ok(filter.postedAt.$lte instanceof Date);
  assert.equal(filter.postedAt.$gte.getTime(), now - THIRTY_DAYS_MS);
  assert.equal(filter.postedAt.$lte.getTime(), now + DEFAULT_CLOCK_SKEW_TOLERANCE_MS);
});

test('Provider date field mappings: Adzuna uses created, The Muse and Remotive use publication_date', () => {
  const adzuna = normalizeAdzunaJob({
    id: 101,
    title: 'Adzuna Eng',
    company: { display_name: 'Adzuna Co' },
    created: '2026-10-20T10:00:00Z',
    redirect_url: 'https://adzuna.com/job/101',
  });
  assert.ok(adzuna.postedAt instanceof Date);
  assert.equal(adzuna.postedAt.toISOString(), '2026-10-20T10:00:00.000Z');

  const muse = normalizeMuseJob({
    id: 202,
    name: 'Muse Designer',
    company: { name: 'Muse Co' },
    publication_date: '2026-10-18T14:30:00Z',
    refs: { landing_page: 'https://themuse.com/job/202' },
  });
  assert.ok(muse.postedAt instanceof Date);
  assert.equal(muse.postedAt.toISOString(), '2026-10-18T14:30:00.000Z');

  const remotive = normalizeRemotiveJob({
    id: 303,
    title: 'Remotive Fullstack',
    company_name: 'Remotive Co',
    publication_date: '2026-10-15T09:00:00',
    url: 'https://remotive.com/job/303',
  });
  assert.ok(remotive.postedAt instanceof Date);
  assert.equal(remotive.postedAt.toISOString(), '2026-10-15T09:00:00.000Z');
});

test('filterJobsByLast30Days correctly separates recent from outdated jobs', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const jobs = [
    { title: 'Job Recent 1', postedAt: new Date(now - 5 * 86400000) },
    { title: 'Job Recent 2', postedAt: new Date(now - 29 * 86400000) },
    { title: 'Job Old 1', postedAt: new Date(now - 32 * 86400000) },
    { title: 'Job Old 2', postedAt: '2024-01-01T00:00:00Z' },
    { title: 'Job Undated', postedAt: null },
  ];

  const filtered = filterJobsByLast30Days(jobs, { referenceTime: now });
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].title, 'Job Recent 1');
  assert.equal(filtered[1].title, 'Job Recent 2');
});

test('IngestionManager: tracks batch progress and completes providers honestly', async () => {
  ingestionManager.startProvider('Adzuna', { reportedTotal: 155378, accessibleLimit: 5000 });
  const p1 = ingestionManager.getProvider('Adzuna');
  assert.equal(p1.status, 'running');
  assert.equal(p1.truncated, true);

  ingestionManager.recordBatch('Adzuna', {
    pages: 10,
    raw: 500,
    validDates: 480,
    recent30Days: 450,
    insertedOrUpdated: 450,
  });

  assert.equal(p1.pagesRequested, 10);
  assert.equal(p1.rawReceived, 500);
  assert.equal(p1.recent30DaysCount, 450);

  ingestionManager.completeProvider('Adzuna', { message: 'Accessible catalog ingested' });
  assert.equal(p1.status, 'completed');
  assert.equal(p1.truncated, false);
});

test('Remotive completed state: 10 listings fetched marks ingestion completed without truncation', () => {
  ingestionManager.completeProvider('Remotive', {
    ingestedTotal: 10,
    message: remotiveIngestionMessage({
      rawReceived: 10,
      reportedTotal: 10,
      catalogTotal: 10,
      eligibleCount: 10,
    }),
  });
  const remotive = ingestionManager.getProvider('Remotive');
  assert.equal(remotive.status, 'completed');
  assert.equal(remotive.truncated, false);
  assert.match(remotive.message, /job-count=10/);
  assert.equal(buildRemotiveSearchUrl({ limit: 12, fetchAll: false }).includes('limit='), false);
});

test('Remotive: full response with > 10 jobs processes all items without arbitrary 10-cap truncation', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const mockJobs = Array.from({ length: 25 }, (_, i) => ({
    id: 1000 + i,
    title: `Remote Role ${i + 1}`,
    company_name: `Company ${i + 1}`,
    url: `https://remotive.com/job/${1000 + i}`,
    publication_date: new Date(now - (i % 25) * 86400000).toISOString(),
    candidate_required_location: 'Worldwide',
  }));

  const interpreted = interpretRemotivePayload(
    { 'job-count': 25, 'total-job-count': 25, jobs: mockJobs },
    { referenceTime: now }
  );
  assert.equal(interpreted.normalized.length, 25);
  assert.equal(interpreted.eligible.length, 25);
  assert.equal(interpreted.reportedTotal, 25);
  assert.equal(interpreted.eligible[0].providerJobId, '1000');
  assert.equal(interpreted.eligible[24].providerJobId, '1024');
  assert.match(
    remotiveIngestionMessage({
      rawReceived: interpreted.results.length,
      reportedTotal: interpreted.reportedTotal,
      catalogTotal: interpreted.catalogTotal,
      eligibleCount: interpreted.eligible.length,
    }),
    /job-count=25/
  );
});

test('Remotive: deduplication updates existing records instead of creating duplicates', () => {
  const jobA1 = normalizeRemotiveJob({
    id: 999,
    title: 'Original Title',
    company_name: 'Tech Corp',
    url: 'https://remotive.com/job/999',
    publication_date: '2026-10-20T10:00:00Z',
  });
  const jobA2 = normalizeRemotiveJob({
    id: 999,
    title: 'Updated Title',
    company_name: 'Tech Corp',
    url: 'https://remotive.com/job/999',
    publication_date: '2026-10-20T10:00:00Z',
  });

  const deduped = dedupeJobs([jobA1, jobA2]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].providerJobId, '999');
});

test('Remotive: jobs older than 30 days are rejected while recent are retained', () => {
  const now = new Date('2026-10-25T18:00:00.000Z').getTime();
  const recentJob = normalizeRemotiveJob({
    id: 888,
    title: 'Recent Job',
    company_name: 'Good Co',
    url: 'https://remotive.com/job/888',
    publication_date: new Date(now - 2 * 86400000).toISOString(),
  });
  const oldJob = normalizeRemotiveJob({
    id: 777,
    title: 'Old Job',
    company_name: 'Old Co',
    url: 'https://remotive.com/job/777',
    publication_date: new Date(now - 45 * 86400000).toISOString(),
  });

  const eligible = filterJobsByLast30Days([recentJob, oldJob], { referenceTime: now });
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].providerJobId, '888');
});

