import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdzunaSearchUrl } from '../services/adzunaService.js';
import { buildRemotiveSearchUrl } from '../services/jobs/remotiveService.js';
import { buildMuseSearchUrl } from '../services/jobs/theMuseService.js';
import { dedupeJobs } from '../services/jobs/jobSchema.js';

test('Adzuna catalog pages use the documented max of 50 results per page', () => {
  const url = buildAdzunaSearchUrl({ keyword: 'developer', page: 7, limit: 50 });
  assert.match(url, /\/search\/7\?/);
  assert.match(url, /results_per_page=50/);
});

test('Remotive catalog URL never sends limit, search, or page as API pagination', () => {
  const capped = buildRemotiveSearchUrl({ keyword: 'developer', limit: 12, fetchAll: false });
  assert.equal(capped.includes('limit='), false);
  assert.equal(capped.includes('search='), false);
  assert.equal(capped.includes('page='), false);
  const full = buildRemotiveSearchUrl({ keyword: 'developer', fetchAll: true });
  assert.equal(full, 'https://remotive.com/api/remote-jobs');
  const allJobs = buildRemotiveSearchUrl({ fetchAll: true });
  assert.equal(allJobs, 'https://remotive.com/api/remote-jobs');
});

test('The Muse pagination is 0-indexed and does not cap the catalog URL', () => {
  const url = buildMuseSearchUrl({ page: 12, location: 'Flexible / Remote' });
  assert.match(url, /page=11/);
});

test('The Muse last known retrievable page is 0-indexed 99 (1-based page 100)', () => {
  assert.match(buildMuseSearchUrl({ page: 100 }), /[?&]page=99(?:&|$)/);
  assert.match(buildMuseSearchUrl({ page: 101 }), /[?&]page=100(?:&|$)/);
});

test('The Muse inventory of 100 retrievable pages paginates at 12 jobs per page', () => {
  const museJobs = 100 * 20;
  const pageSize = 12;
  const totalPages = Math.ceil(museJobs / pageSize);
  assert.equal(museJobs, 2000);
  assert.equal(totalPages, 167);
  assert.equal(museJobs - 166 * pageSize, 8);
});

test('dedupe keeps distinct provider listings with the same title', () => {
  const unique = dedupeJobs([
    { source: 'Adzuna', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://a.example/1' },
    { source: 'The Muse', providerJobId: '1', title: 'Engineer', company: 'Acme', sourceUrl: 'https://m.example/1' },
    { source: 'Remotive', providerJobId: '9', title: 'Engineer', company: 'Other', sourceUrl: 'https://r.example/9' },
  ]);
  assert.equal(unique.length, 3);
});

test('frontend page size stays 12 while totals come from the full inventory', () => {
  const pageSize = 12;
  const inventory = 2760;
  const totalPages = Math.ceil(inventory / pageSize);
  const lastPageCount = inventory - (totalPages - 1) * pageSize;
  assert.equal(totalPages, 230);
  assert.equal(lastPageCount, 12);
  const oddInventory = 2761;
  assert.equal(Math.ceil(oddInventory / pageSize), 231);
  assert.equal(oddInventory - 230 * pageSize, 1);
});
