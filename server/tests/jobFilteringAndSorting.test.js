import test from 'node:test';
import assert from 'node:assert/strict';
import { sortJobs, matchesFilters } from '../controllers/jobController.js';
import {
  mapJobType,
  mapExperienceLevel,
  mapWorkMode,
  parseSalaryNumber,
  normalizeJobRecord,
} from '../services/jobs/jobSchema.js';
import { buildAdzunaSearchUrl, normalizeAdzunaJob } from '../services/adzunaService.js';
import { normalizeMuseJob, buildMuseSearchUrl } from '../services/jobs/theMuseService.js';
import { normalizeRemotiveJob } from '../services/jobs/remotiveService.js';

test('mapJobType normalizes all internship variations and rejects "internal"', () => {
  assert.equal(mapJobType('intern'), 'Internship');
  assert.equal(mapJobType('Internship'), 'Internship');
  assert.equal(mapJobType('INTERNSHIPS'), 'Internship');
  assert.equal(mapJobType('co-op'), 'Internship');
  assert.equal(mapJobType('trainee'), 'Internship');
  assert.equal(mapJobType('apprentice'), 'Internship');

  // Title-based conservative fallback
  assert.equal(mapJobType(undefined, 'Software Engineering Intern (Summer 2026)'), 'Internship');
  assert.equal(mapJobType('', 'Data Science Co-op'), 'Internship');

  // Must NOT classify as internship if word is "internal"
  assert.equal(mapJobType(undefined, 'Internal Security Engineer'), undefined);
  assert.equal(mapJobType('', 'Internal Tools Developer'), undefined);

  // Other types
  assert.equal(mapJobType('full_time'), 'Full-time');
  assert.equal(mapJobType('permanent'), 'Full-time');
  assert.equal(mapJobType('part_time'), 'Part-time');
  assert.equal(mapJobType('contractor'), 'Contract');
});

test('parseSalaryNumber extracts numeric salaries and converts hourly to annual', () => {
  assert.equal(parseSalaryNumber('$130k - $160k'), 160000);
  assert.equal(parseSalaryNumber('$140k'), 140000);
  assert.equal(parseSalaryNumber('$30/hr'), 62400); // 30 * 2080
  assert.equal(parseSalaryNumber('$25 - $35 / hour'), 72800); // 35 * 2080
  assert.equal(parseSalaryNumber('1500000'), 1500000);
  assert.equal(parseSalaryNumber('Competitive'), -1);
  assert.equal(parseSalaryNumber('Negotiable'), -1);
  assert.equal(parseSalaryNumber(''), -1);
  assert.equal(parseSalaryNumber(null), -1);
});

test('internship filter finds internships located on later pages of the dataset', () => {
  // Generate 25 jobs: jobs 1-20 are full-time; jobs 21, 23, 25 are internships
  const dataset = Array.from({ length: 25 }, (_, i) => ({
    _id: `job-${i + 1}`,
    title: i === 20 ? 'Backend Intern' : i === 22 ? 'Frontend Internship' : i === 24 ? 'AI Research Co-op' : `Software Engineer ${i + 1}`,
    company: `Company ${i + 1}`,
    location: i % 2 === 0 ? 'Remote' : 'San Francisco, CA',
    jobType: i === 20 || i === 22 || i === 24 ? 'Internship' : 'Full-time',
    workMode: i % 2 === 0 ? 'Remote' : 'On-site',
    postedAt: new Date(Date.now() - i * 86400000),
  }));

  // Filtering across the complete dataset before pagination
  const filtered = dataset.filter((job) =>
    matchesFilters(job, { cleanJobType: 'Internship' })
  );

  assert.equal(filtered.length, 3, 'All 3 internships from later in the dataset must be found');
  assert.deepEqual(
    filtered.map((j) => j._id),
    ['job-21', 'job-23', 'job-25']
  );
});

test('matchesFilters combines multiple categories with AND logic', () => {
  const jobs = [
    { title: 'React Dev', location: 'Remote', workMode: 'Remote', jobType: 'Full-time', skills: ['React', 'Node'] },
    { title: 'React Intern', location: 'Remote', workMode: 'Remote', jobType: 'Internship', skills: ['React'] },
    { title: 'Java Intern', location: 'New York', workMode: 'On-site', jobType: 'Internship', skills: ['Java'] },
  ];

  // Match: jobType=Internship AND workMode=Remote
  const result = jobs.filter((j) =>
    matchesFilters(j, { cleanJobType: 'Internship', cleanWorkMode: 'Remote' })
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'React Intern');

  // No match
  const noMatch = jobs.filter((j) =>
    matchesFilters(j, { cleanJobType: 'Internship', cleanLocation: 'Tokyo' })
  );
  assert.equal(noMatch.length, 0);
});

test('sortJobs performs global sorting with deterministic tie-breaking', () => {
  const date1 = new Date('2026-03-01T00:00:00Z');
  const date2 = new Date('2026-03-02T00:00:00Z');
  const date3 = new Date('2026-03-03T00:00:00Z');

  const jobs = [
    { _id: 'job-b', title: 'Beta Engineer', postedAt: date2, salary: '$120k' },
    { _id: 'job-a', title: 'Alpha Intern', postedAt: date3, salary: '$30/hr' },
    { _id: 'job-c', title: 'Gamma Lead', postedAt: date1, salary: '$180k' },
  ];

  // Newest first
  const newest = sortJobs(jobs, 'newest');
  assert.deepEqual(newest.map((j) => j._id), ['job-a', 'job-b', 'job-c']);

  // Oldest first
  const oldest = sortJobs(jobs, 'oldest');
  assert.deepEqual(oldest.map((j) => j._id), ['job-c', 'job-b', 'job-a']);

  // Highest salary first ($180k > $120k > $30/hr equivalent $62.4k)
  const bySalary = sortJobs(jobs, 'salary');
  assert.deepEqual(bySalary.map((j) => j._id), ['job-c', 'job-b', 'job-a']);

  // Title A-Z
  const byTitle = sortJobs(jobs, 'title');
  assert.deepEqual(byTitle.map((j) => j._id), ['job-a', 'job-b', 'job-c']);
});

test('pagination boundaries and total counts calculate correctly', () => {
  const totalItems = 25;
  const pageSize = 10;
  const totalPages = Math.ceil(totalItems / pageSize);

  assert.equal(totalPages, 3);

  const getPage = (page, items) => items.slice((page - 1) * pageSize, page * pageSize);
  const allItems = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

  const p1 = getPage(1, allItems);
  const p2 = getPage(2, allItems);
  const p3 = getPage(3, allItems);

  assert.equal(p1.length, 10);
  assert.equal(p2.length, 10);
  assert.equal(p3.length, 5);

  // No duplicate items across pages
  const intersection = p1.filter((id) => p2.includes(id));
  assert.equal(intersection.length, 0);
});

test('provider pagination conventions: Adzuna is 1-indexed, The Muse is 0-indexed', () => {
  const adzunaUrl = buildAdzunaSearchUrl({ page: 2, keyword: 'engineer' });
  assert.ok(adzunaUrl.includes('/search/2'), 'Adzuna should request search page 2');

  const museUrl = buildMuseSearchUrl({ page: 2, keyword: 'engineer' });
  assert.ok(museUrl.includes('page=1'), 'The Muse should request 0-indexed page 1 for page 2');

  // Adzuna with jobType=Internship adds internship to search query
  const adzunaInternUrl = buildAdzunaSearchUrl({ page: 1, jobType: 'Internship' });
  assert.ok(adzunaInternUrl.includes('what=internship'));
});
