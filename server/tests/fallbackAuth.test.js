import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoUser, findDemoUserByEmail, findDemoUserById } from '../config/demoUsers.js';

test('demo auth store supports registration and lookup without MongoDB', () => {
  const email = 'demo.user@example.com';
  const user = createDemoUser({
    _id: 'demo-user-1',
    name: 'Demo User',
    email,
    password: 'hashed-password',
    skills: ['JavaScript'],
    preferredRoles: ['Frontend Engineer'],
    socialLinks: { linkedin: 'https://example.com' },
  });

  assert.equal(user.email, email);
  assert.deepEqual(findDemoUserByEmail(email), user);
  assert.deepEqual(findDemoUserById('demo-user-1'), user);
});
