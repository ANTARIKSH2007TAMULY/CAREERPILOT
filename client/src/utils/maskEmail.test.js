import test from 'node:test';
import assert from 'node:assert/strict';
import { maskEmail } from './maskEmail.js';

test('masks a long local part to three visible characters and at most five asterisks', () => {
  assert.equal(maskEmail('25f3005566@ds.study.iitm.ac.in'), '25f*****@ds.study.iitm.ac.in');
  assert.equal(maskEmail('john.doe@gmail.com'), 'joh*****@gmail.com');
  assert.equal(maskEmail('john@example.com'), 'joh*@example.com');
});

test('preserves a local part of exactly three characters', () => {
  assert.equal(maskEmail('abc@example.com'), 'abc@example.com');
});

test('preserves a local part shorter than three characters', () => {
  assert.equal(maskEmail('ab@example.com'), 'ab@example.com');
  assert.equal(maskEmail('a@example.com'), 'a@example.com');
});

test('handles missing or empty values without throwing', () => {
  assert.equal(maskEmail(undefined), '');
  assert.equal(maskEmail(null), '');
  assert.equal(maskEmail(''), '');
  assert.equal(maskEmail('   '), '');
});

test('handles invalid values without an @ separator', () => {
  assert.equal(maskEmail('not-an-email'), '');
  assert.equal(maskEmail('@missing-local.com'), '');
  assert.equal(maskEmail('missing-domain@'), '');
});

test('updates the masked display when the connected Google account changes', () => {
  const firstAccount = '25f3005566@ds.study.iitm.ac.in';
  const secondAccount = 'janedoe@gmail.com';

  assert.equal(maskEmail(firstAccount), '25f*****@ds.study.iitm.ac.in');
  assert.equal(maskEmail(secondAccount), 'jan****@gmail.com');
  assert.notEqual(maskEmail(firstAccount), maskEmail(secondAccount));
});

test('does not mutate the original email used for internal operations', () => {
  const original = '25f3005566@ds.study.iitm.ac.in';
  const snapshot = original;
  const displayed = maskEmail(original);

  assert.equal(original, snapshot);
  assert.equal(original, '25f3005566@ds.study.iitm.ac.in');
  assert.equal(displayed, '25f*****@ds.study.iitm.ac.in');
  assert.notEqual(displayed, original);
});
