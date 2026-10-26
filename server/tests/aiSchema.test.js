import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, validateJobMatch, validateResumeAnalysis } from '../services/ai/aiSchemas.js';

test('validateJobMatch rejects payloads without a numeric score', () => {
  assert.equal(validateJobMatch({ summary: 'Looks good' }), null);
});

test('validateJobMatch accepts structured AI output and labels it as generated', () => {
  const result = validateJobMatch({
    matchScore: 81.4,
    strengths: ['React'],
    missingSkills: ['Go'],
    recommendations: ['Practice Go basics'],
    summary: 'Solid frontend overlap.',
  });

  assert.equal(result.matchScore, 81);
  assert.equal(result.generatedByAI, true);
  assert.match(result.disclaimer, /AI-generated/);
});

test('validateResumeAnalysis never treats missing JSON as valid', () => {
  assert.equal(validateResumeAnalysis(null), null);
  const result = validateResumeAnalysis({
    strengths: ['Python'],
    skillGaps: ['SQL'],
    suggestions: ['Add a quantified project'],
    summary: 'Keep achievements factual.',
  });
  assert.equal(result.generatedByAI, true);
  assert.deepEqual(result.skillGaps, ['SQL']);
});

test('extractJson reads fenced model output', () => {
  const parsed = extractJson('Sure. {"answer":"Focus on internships first"}');
  assert.equal(parsed.answer, 'Focus on internships first');
});
