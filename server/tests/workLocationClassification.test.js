import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapWorkMode,
  normalizeJobRecord,
  isExplicitlyRemote,
  isExplicitlyNotRemote,
} from '../services/jobs/jobSchema.js';
import { normalizeAdzunaJob } from '../services/adzunaService.js';
import { normalizeMuseJob } from '../services/jobs/theMuseService.js';
import { normalizeRemotiveJob } from '../services/jobs/remotiveService.js';
import Job from '../models/Job.js';

test('mapWorkMode: Explicit Remote listings return Remote', () => {
  assert.equal(mapWorkMode('Remote'), 'Remote');
  assert.equal(mapWorkMode('', 'Senior Remote Software Engineer'), 'Remote');
  assert.equal(mapWorkMode({ title: 'Full Stack Dev', description: 'This is a 100% remote position.' }), 'Remote');
  assert.equal(mapWorkMode({ title: 'Engineer', description: 'Work from home anywhere in the world' }), 'Remote');
  assert.equal(mapWorkMode({ title: 'Product Manager', location: 'Flexible / Remote' }), 'Remote');
});

test('mapWorkMode: Explicit Hybrid listings return Hybrid', () => {
  assert.equal(mapWorkMode('Hybrid'), 'Hybrid');
  assert.equal(mapWorkMode('', 'DevOps Engineer (Hybrid)'), 'Hybrid');
  assert.equal(mapWorkMode({ title: 'Designer', description: 'Role involves hybrid work with 2 days at home.' }), 'Hybrid');
  assert.equal(mapWorkMode({ title: 'Manager', description: 'Flexible remote and office balance (hybrid).' }), 'Hybrid');
});

test('mapWorkMode: Explicit On-site listings return On-site', () => {
  assert.equal(mapWorkMode('On-site'), 'On-site');
  assert.equal(mapWorkMode('Onsite'), 'On-site');
  assert.equal(mapWorkMode('', 'Operations Coordinator (On-site)'), 'On-site');
  assert.equal(mapWorkMode({ title: 'Lab Technician', description: 'This is an in-office / work from office position.' }), 'On-site');
  assert.equal(mapWorkMode({ title: 'Technician', description: 'Duties performed on-premise at our facility.' }), 'On-site');
});

test('mapWorkMode: Does NOT mistake "office" (Microsoft Office, Office Assistant) for On-site', () => {
  // Should not trigger on-site merely from the word "office"
  assert.equal(mapWorkMode('', 'Office Assistant'), 'Unspecified');
  assert.equal(mapWorkMode({ title: 'Analyst', description: 'Must have proficiency in Microsoft Office 365.' }), 'Unspecified');
});

test('mapWorkMode: A geographic city/country alone returns Unspecified', () => {
  assert.equal(mapWorkMode({ location: 'Bengaluru, India', title: 'Java Developer' }), 'Unspecified');
  assert.equal(mapWorkMode({ location: 'London, UK', title: 'Data Scientist' }), 'Unspecified');
  assert.equal(mapWorkMode({ location: 'Springdale, AR', title: 'Grab & Go Food Associate' }), 'Unspecified');
  assert.equal(mapWorkMode({ location: 'Hernando, MS', title: 'LPN - Inpatient' }), 'Unspecified');
});

test('mapWorkMode: Missing or empty location does NOT default to Remote', () => {
  assert.equal(mapWorkMode({ location: '', title: 'Developer' }), 'Unspecified');
  assert.equal(mapWorkMode({ location: null, title: 'Developer' }), 'Unspecified');
  assert.equal(mapWorkMode({ location: undefined, title: '' }), 'Unspecified');
  assert.equal(mapWorkMode(''), 'Unspecified');
});

test('isExplicitlyNotRemote: Safely handles string "false" vs boolean false', () => {
  assert.equal(isExplicitlyNotRemote(false), true);
  assert.equal(isExplicitlyNotRemote('false'), true);
  assert.equal(isExplicitlyNotRemote('0'), true);
  assert.equal(isExplicitlyNotRemote('no'), true);
  assert.equal(isExplicitlyNotRemote('true'), false);
  assert.equal(isExplicitlyNotRemote(true), false);

  // If remote is explicitly string "false", mapWorkMode must not classify as Remote even if title says remote
  assert.notEqual(mapWorkMode({ remote: 'false', title: 'Engineer' }), 'Remote');
  assert.notEqual(mapWorkMode({ remote: false, title: 'Engineer' }), 'Remote');
});

test('isExplicitlyRemote: Safely identifies remote truthy values', () => {
  assert.equal(isExplicitlyRemote(true), true);
  assert.equal(isExplicitlyRemote('true'), true);
  assert.equal(isExplicitlyRemote('1'), true);
  assert.equal(isExplicitlyRemote('yes'), true);
  assert.equal(isExplicitlyRemote('remote'), true);
  assert.equal(isExplicitlyRemote('false'), false);
  assert.equal(isExplicitlyRemote(false), false);
  assert.equal(isExplicitlyRemote(null), false);
  assert.equal(isExplicitlyRemote(undefined), false);
});

test('normalizeJobRecord: Safe handling of null, missing, and malformed fields', () => {
  assert.equal(normalizeJobRecord(null), null);
  assert.equal(normalizeJobRecord({}), null);
  assert.equal(normalizeJobRecord({ title: 'A' }), null); // Missing company, url, provider

  const valid = normalizeJobRecord({
    title: 'Security Analyst',
    company: 'Fintech Corp',
    listingUrl: 'https://example.com/job/101',
    provider: 'Adzuna',
    location: null,
    workMode: null,
  });

  assert.ok(valid);
  assert.equal(valid.location, ''); // Never defaulted to 'Remote'
  assert.equal(valid.workMode, 'Unspecified'); // Never defaulted to 'Remote'
});

test('Adzuna normalization: Accurately classifies remote, hybrid, on-site, and unspecified', () => {
  // 1. Explicit remote
  const remoteJob = normalizeAdzunaJob({
    id: 1,
    title: 'Work From Home Customer Support',
    company: { display_name: 'Support Co' },
    description: '100% remote job from home.',
    location: { display_name: 'Delhi, India' },
    redirect_url: 'https://example.com/1',
  });
  assert.equal(remoteJob.workMode, 'Remote');
  assert.equal(remoteJob.location, 'Delhi, India');

  // 2. Explicit hybrid
  const hybridJob = normalizeAdzunaJob({
    id: 2,
    title: 'Software Engineer',
    company: { display_name: 'Tech Co' },
    description: 'This is a hybrid role requiring 2 days in Bangalore office.',
    location: { display_name: 'Bangalore, Karnataka' },
    redirect_url: 'https://example.com/2',
  });
  assert.equal(hybridJob.workMode, 'Hybrid');
  assert.equal(hybridJob.location, 'Bangalore, Karnataka');

  // 3. Explicit on-site
  const onsiteJob = normalizeAdzunaJob({
    id: 3,
    title: 'Hardware Engineer (On-site)',
    company: { display_name: 'Hardware Co' },
    description: 'Must work on-site at lab facility.',
    location: { display_name: 'Hyderabad, India' },
    redirect_url: 'https://example.com/3',
  });
  assert.equal(onsiteJob.workMode, 'On-site');
  assert.equal(onsiteJob.location, 'Hyderabad, India');

  // 4. City present without work arrangement statement -> Unspecified
  const normalJob = normalizeAdzunaJob({
    id: 4,
    title: 'Developer',
    company: { display_name: 'Call Your Buddy' },
    description: 'Develop and maintain Java microservices.',
    location: { display_name: 'Kochi, Ernakulam' },
    redirect_url: 'https://example.com/4',
  });
  assert.equal(normalJob.workMode, 'Unspecified');
  assert.equal(normalJob.location, 'Kochi, Ernakulam');
});

test('The Muse normalization: Separates physical location from Flexible/Remote', () => {
  // 1. Multi-location with Flexible / Remote and physical city
  const museRemote = normalizeMuseJob({
    id: 10,
    name: 'Senior Product Manager',
    locations: [{ name: 'Flexible / Remote' }, { name: 'New York, NY' }],
    refs: { landing_page: 'https://themuse.com/10' },
    company: { name: 'Muse Inc' },
  });
  assert.equal(museRemote.workMode, 'Remote');
  assert.equal(museRemote.location, 'New York, NY'); // Physical location preserved separately!

  // 2. In-person location with no remote flag (e.g. Walmart retail or hospital nurse)
  const musePhysical = normalizeMuseJob({
    id: 20,
    name: 'Retail Customer Service Associate',
    locations: [{ name: 'Omaha, NE' }],
    refs: { landing_page: 'https://themuse.com/20' },
    company: { name: 'Walmart' },
  });
  assert.equal(musePhysical.workMode, 'Unspecified');
  assert.equal(musePhysical.location, 'Omaha, NE');

  // 3. Only Flexible / Remote specified
  const museRemoteOnly = normalizeMuseJob({
    id: 30,
    name: 'Frontend Developer',
    locations: [{ name: 'Flexible / Remote' }],
    refs: { landing_page: 'https://themuse.com/30' },
    company: { name: 'Startup Inc' },
  });
  assert.equal(museRemoteOnly.workMode, 'Remote');
  assert.equal(museRemoteOnly.location, 'Remote');
});

test('Remotive normalization: Preserves candidate geographic eligibility and verifies remote', () => {
  const remotiveJob = normalizeRemotiveJob({
    id: 50,
    title: 'AI Trainer - Video Annotation',
    company_name: 'iMerit',
    candidate_required_location: 'Worldwide',
    description: '<p>Remote | Independent Contractor</p>',
    url: 'https://remotive.com/50',
  });
  assert.equal(remotiveJob.workMode, 'Remote');
  assert.equal(remotiveJob.location, 'Worldwide'); // Not replaced with generic 'Remote'
});

test('Job Mongoose Model: schema defaults must NOT assign Remote', () => {
  const job = new Job({
    title: 'Software Developer',
    company: 'Test Corp',
    description: 'Test description',
    applyUrl: 'https://example.com/apply',
  });

  assert.equal(job.location, ''); // Must not default to 'Remote'
  assert.equal(job.workMode, 'Unspecified'); // Must not default to 'Remote'
});
