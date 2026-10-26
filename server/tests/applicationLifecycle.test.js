import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDemoApplication,
  findDemoApplicationById,
  findDemoApplicationsByUser,
  updateDemoApplication,
  deleteDemoApplication,
  clearDemoApplications,
} from '../config/demoApplications.js';
import {
  createDemoSavedJob,
  deleteDemoSavedJob,
  findDemoSavedJobsByUser,
  clearDemoSavedJobs,
} from '../config/demoSavedJobs.js';

test('Application tracker: creation with INTERESTED sets appliedAt to null', () => {
  clearDemoApplications();
  const app = createDemoApplication({
    user: 'user-1',
    jobTitle: 'Frontend Engineer',
    company: 'Stripe',
    status: 'INTERESTED',
  });

  assert.equal(app.status, 'INTERESTED');
  assert.equal(app.appliedAt, null, 'appliedAt should not be set for INTERESTED status');
  assert.equal(app.company, 'Stripe');
  assert.equal(app.statusHistory.length, 1);
  assert.equal(app.statusHistory[0].status, 'INTERESTED');
});

test('Application tracker: creation with APPLIED records genuine appliedAt timestamp', () => {
  clearDemoApplications();
  const app = createDemoApplication({
    user: 'user-1',
    jobTitle: 'Backend Engineer',
    company: 'Google',
    status: 'APPLIED',
  });

  assert.equal(app.status, 'APPLIED');
  assert.ok(app.appliedAt instanceof Date, 'appliedAt must be a valid Date object');
  assert.ok(Date.now() - app.appliedAt.getTime() < 5000, 'appliedAt should reflect current time');
});

test('Application tracker: status transition records history and sets appliedAt when moving to APPLIED', () => {
  clearDemoApplications();
  const app = createDemoApplication({
    user: 'user-1',
    jobTitle: 'Fullstack Engineer',
    company: 'Vercel',
    status: 'INTERESTED',
  });

  assert.equal(app.appliedAt, null);

  const updated = updateDemoApplication(app._id, 'user-1', {
    status: 'APPLIED',
    notes: 'Submitted via company website',
  });

  assert.equal(updated.status, 'APPLIED');
  assert.ok(updated.appliedAt instanceof Date);
  assert.equal(updated.statusHistory.length, 2);
  assert.equal(updated.statusHistory[1].status, 'APPLIED');
  assert.equal(updated.statusHistory[1].notes, 'Submitted via company website');
});

test('Application tracker: user isolation prevents unauthorized user from reading or modifying another user application', () => {
  clearDemoApplications();
  const appUserA = createDemoApplication({
    user: 'user-A',
    jobTitle: 'Security Engineer',
    company: 'Cloudflare',
    status: 'APPLIED',
  });

  // User B tries to read User A's application
  const readAttempt = findDemoApplicationById(appUserA._id, 'user-B');
  assert.equal(readAttempt, null, 'User B must not read User A application');

  // User B tries to update User A's application
  const updateAttempt = updateDemoApplication(appUserA._id, 'user-B', {
    status: 'REJECTED',
  });
  assert.equal(updateAttempt, null, 'User B must not modify User A application');

  // Verify original record is unchanged
  const unchanged = findDemoApplicationById(appUserA._id, 'user-A');
  assert.equal(unchanged.status, 'APPLIED');
});

test('Application tracker: saving a job does NOT create an application or mark as applied', () => {
  clearDemoApplications();
  clearDemoSavedJobs();

  // User saves a job to their shortlist
  const savedJob = createDemoSavedJob('user-1', {
    _id: 'job-123',
    title: 'Data Scientist',
    company: 'Anthropic',
  });

  assert.equal(savedJob.alreadySaved, false);

  // Verify it exists in saved jobs
  const userSaved = findDemoSavedJobsByUser('user-1');
  assert.equal(userSaved.length, 1);
  assert.equal(userSaved[0].jobId, 'job-123');

  // Verify NO application was automatically created
  const userApplications = findDemoApplicationsByUser('user-1');
  assert.equal(userApplications.length, 0, 'Saved job must NOT automatically create an application record');
});

test('Application tracker: filter by status and search by company or title', () => {
  clearDemoApplications();
  createDemoApplication({ user: 'user-1', jobTitle: 'React Dev', company: 'Airbnb', status: 'INTERESTED' });
  createDemoApplication({ user: 'user-1', jobTitle: 'Node Dev', company: 'Netflix', status: 'APPLIED' });
  createDemoApplication({ user: 'user-1', jobTitle: 'Staff Eng', company: 'Meta', status: 'INTERVIEW' });

  const appliedOnly = findDemoApplicationsByUser('user-1', { status: 'APPLIED' });
  assert.equal(appliedOnly.length, 1);
  assert.equal(appliedOnly[0].company, 'Netflix');

  const searchNetflix = findDemoApplicationsByUser('user-1', { search: 'netflix' });
  assert.equal(searchNetflix.length, 1);
  assert.equal(searchNetflix[0].company, 'Netflix');

  const searchDev = findDemoApplicationsByUser('user-1', { search: 'dev' });
  assert.equal(searchDev.length, 2);
});

test('Application tracker: deleting an application enforces user ownership', () => {
  clearDemoApplications();
  const app = createDemoApplication({
    user: 'user-1',
    jobTitle: 'QA Engineer',
    company: 'Apple',
  });

  // Unauthorized delete attempt
  const fakeDelete = deleteDemoApplication(app._id, 'user-2');
  assert.equal(fakeDelete, false);
  assert.ok(findDemoApplicationById(app._id, 'user-1') !== null);

  // Authorized delete
  const realDelete = deleteDemoApplication(app._id, 'user-1');
  assert.equal(realDelete, true);
  assert.equal(findDemoApplicationById(app._id, 'user-1'), null);
});
