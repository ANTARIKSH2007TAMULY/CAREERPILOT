import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDemoApplication,
  findDemoApplicationsByUser,
  findDemoApplicationByJobOrIdentity,
  clearDemoApplications,
} from '../config/demoApplications.js';
import {
  createDemoSavedJob,
  findDemoSavedJobsByUser,
  clearDemoSavedJobs,
} from '../config/demoSavedJobs.js';

test('Analytics calculations: zero-safe conversion rates when no applications exist', () => {
  clearDemoApplications();
  clearDemoSavedJobs();

  const applications = findDemoApplicationsByUser('empty-user');
  assert.equal(applications.length, 0);

  const submitted = applications.filter((app) =>
    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(app.status)
  ).length;

  const interviews = applications.filter((app) => app.status === 'INTERVIEW').length;
  const offers = applications.filter((app) => app.status === 'OFFER' || app.status === 'ACCEPTED').length;

  const safePercent = (num, denom) => (denom > 0 ? Number(((num / denom) * 100).toFixed(1)) : 0);

  assert.equal(safePercent(interviews, submitted), 0, 'Interview conversion must be 0, not NaN or error');
  assert.equal(safePercent(offers, interviews), 0, 'Offer conversion must be 0, not NaN or error');
  assert.equal(safePercent(0, submitted), 0, 'Response rate must be 0, not NaN or error');
});

test('Analytics calculations: correct responseRate and conversion rates with real records', () => {
  clearDemoApplications();
  const userId = 'stats-user';

  // 1 Interested (not submitted)
  createDemoApplication({ user: userId, jobTitle: 'A', company: 'C1', status: 'INTERESTED' });
  // 1 Applied (no response yet)
  createDemoApplication({ user: userId, jobTitle: 'B', company: 'C2', status: 'APPLIED' });
  // 1 Interview (responded)
  createDemoApplication({ user: userId, jobTitle: 'C', company: 'C3', status: 'INTERVIEW' });
  // 1 Offer (interviewed and received offer)
  createDemoApplication({ user: userId, jobTitle: 'D', company: 'C4', status: 'OFFER' });
  // 1 Rejected (responded)
  createDemoApplication({ user: userId, jobTitle: 'E', company: 'C5', status: 'REJECTED' });

  const apps = findDemoApplicationsByUser(userId);
  assert.equal(apps.length, 5);

  const submittedApps = apps.filter((app) =>
    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(app.status)
  ).length;
  assert.equal(submittedApps, 4, 'Only non-INTERESTED roles count as submitted');

  const respondedApps = apps.filter((app) =>
    ['ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED'].includes(app.status)
  ).length;
  assert.equal(respondedApps, 3, 'Interview, Offer, and Rejected count as responded');

  const interviews = apps.filter((app) => ['INTERVIEW', 'ASSESSMENT'].includes(app.status)).length;
  assert.equal(interviews, 1);

  const offers = apps.filter((app) => ['OFFER', 'ACCEPTED'].includes(app.status)).length;
  assert.equal(offers, 1);

  const safePercent = (num, denom) => (denom > 0 ? Number(((num / denom) * 100).toFixed(1)) : 0);
  const responseRate = safePercent(respondedApps, submittedApps);
  assert.equal(responseRate, 75.0); // 3 / 4 * 100 = 75%
});

test('Application tracker: duplicate detection finds existing record by jobId, providerJobId, or title+company', () => {
  clearDemoApplications();
  const userId = 'dup-user';

  const app = createDemoApplication({
    user: userId,
    jobTitle: 'DevOps Engineer',
    company: 'HashiCorp',
    providerJobId: 'provider-999',
    status: 'INTERESTED',
  });

  // Duplicate check by providerJobId
  const foundByProvider = findDemoApplicationByJobOrIdentity(userId, { providerJobId: 'provider-999' });
  assert.ok(foundByProvider !== null);
  assert.equal(foundByProvider._id, app._id);

  // Duplicate check by title and company
  const foundByTitleComp = findDemoApplicationByJobOrIdentity(userId, {
    jobTitle: 'DevOps Engineer',
    company: 'HashiCorp',
  });
  assert.ok(foundByTitleComp !== null);
  assert.equal(foundByTitleComp._id, app._id);

  // Different user with same job should NOT match
  const otherUserMatch = findDemoApplicationByJobOrIdentity('other-user', { providerJobId: 'provider-999' });
  assert.equal(otherUserMatch, null);
});
