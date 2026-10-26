import test from 'node:test';
import assert from 'node:assert/strict';
import GeminiProvider from '../services/ai/geminiProvider.js';
import { analyzeJobMatch, analyzeResume, getCoachAdvice } from '../services/ai/aiService.js';
import { validateRoadmap, validateInterviewPrep } from '../services/ai/aiSchemas.js';

test('GeminiProvider generates valid schema-validated output on valid response', async () => {
  const provider = new GeminiProvider('mock-gemini-key');
  assert.equal(provider.isConfigured(), true);

  provider.generateJson = async (prompt, validator) => {
    const raw = {
      matchScore: 88,
      strengths: ['React', 'TypeScript'],
      missingSkills: ['Kubernetes'],
      recommendations: ['Build a containerized sample project'],
      summary: 'Strong frontend alignment with minor DevOps gap.',
    };
    return {
      ...validator(raw),
      provider: provider.name,
    };
  };

  const match = await provider.analyzeJobMatch({
    user: { skills: ['React', 'TypeScript'] },
    job: { title: 'Frontend Developer', company: 'Tech Corp', skills: ['React', 'Kubernetes'] },
  });

  assert.equal(match.matchScore, 88);
  assert.equal(match.generatedByAI, true);
  assert.equal(match.provider, 'gemini');
  assert.deepEqual(match.strengths, ['React', 'TypeScript']);
  assert.deepEqual(match.missingSkills, ['Kubernetes']);
});

test('GeminiProvider rejects invalid structured payload and returns null', async () => {
  const provider = new GeminiProvider('mock-gemini-key');
  assert.equal(provider.isConfigured(), true);

  // When validator fails, generateJson should return null
  provider.generateJson = async (prompt, validator) => {
    const invalid = { someRandomKey: 123 };
    const validated = validator(invalid);
    if (!validated) return null;
    return validated;
  };

  const match = await provider.analyzeJobMatch({
    user: { skills: ['Python'] },
    job: { title: 'Backend Dev' },
  });

  assert.equal(match, null);
});

test('Unconfigured AI providers report isConfigured false', () => {
  const gemini = new GeminiProvider('');
  assert.equal(gemini.isConfigured(), false);
});

test('validateRoadmap enforces schema and structure', () => {
  const valid = validateRoadmap({
    title: 'Frontend Master Path',
    steps: [
      { title: 'Learn React Core', detail: 'State, props, hooks' },
      { title: 'Master State Management', detail: 'Zustand or Redux' },
    ],
    summary: 'Step-by-step career plan',
  });

  assert.equal(valid.title, 'Frontend Master Path');
  assert.equal(valid.steps.length, 2);
  assert.equal(valid.generatedByAI, true);
  assert.match(valid.disclaimer, /AI-generated/);

  assert.equal(validateRoadmap(null), null);
  assert.equal(validateRoadmap('not an object'), null);
});

test('validateInterviewPrep checks questions and feedback structure', () => {
  const valid = validateInterviewPrep({
    questions: ['Tell me about React fiber architecture', 'How do you optimize render performance?'],
    feedback: 'Clear technical communication is essential.',
    focusAreas: ['React Internals', 'Web Performance'],
  });

  assert.equal(valid.questions.length, 2);
  assert.equal(valid.focusAreas.length, 2);
  assert.equal(valid.generatedByAI, true);

  assert.equal(validateInterviewPrep(null), null);
});

test('analyzeJobMatch falls back to honest heuristic when providers fail', async () => {
  // If no providers succeed, honest heuristic is produced
  const heuristic = await analyzeJobMatch(
    {
      user: { skills: ['React', 'CSS'] },
      job: { title: 'Frontend Engineer', skills: ['React', 'CSS', 'TypeScript'] },
    },
    { providers: [] }
  );

  assert.equal(heuristic.generatedByAI, false);
  assert.equal(heuristic.provider, 'heuristic');
  assert.match(heuristic.disclaimer, /Heuristic estimate/);
  assert.ok(heuristic.matchScore >= 0 && heuristic.matchScore <= 100);
});

test('getCoachAdvice falls back to local guidance with honest disclaimer', async () => {
  const advice = await getCoachAdvice(
    {
      user: { skills: ['Node.js'] },
      message: 'Which jobs should I prioritize?',
    },
    { providers: [] }
  );

  assert.ok(advice.answer.length > 10);
  assert.equal(advice.generatedByAI, false);
  assert.match(advice.disclaimer, /Not an AI-generated evaluation/);
});
