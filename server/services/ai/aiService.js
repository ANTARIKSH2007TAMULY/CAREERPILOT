import env from '../../config/env.js';
import GeminiProvider from './geminiProvider.js';

const normalize = (value) => (Array.isArray(value) ? value : []);

export const buildHeuristicMatch = ({ user, job }) => {
  const userSkills = normalize(user?.skills).map((skill) => String(skill).trim().toLowerCase());
  const jobSkills = normalize(job?.skills).map((skill) => String(skill).trim().toLowerCase());
  const strengths = jobSkills.filter((skill) => userSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !userSkills.includes(skill));
  const matchScore = Math.max(35, Math.min(96, Math.round((strengths.length / Math.max(jobSkills.length, 1)) * 100)));

  return {
    provider: 'heuristic',
    matchScore,
    strengths: strengths.slice(0, 5),
    missingSkills: missingSkills.slice(0, 5),
    recommendations: missingSkills.length
      ? [`Prioritize learning ${missingSkills[0]} and related fundamentals before applying.`]
      : ['Your current profile is aligned with the role targets.'],
    summary: `Based on your profile and the role requirements, this opportunity is an estimated ${matchScore}% match.`,
    generatedByAI: false,
    disclaimer: 'Heuristic estimate from listed skills only. Not an AI-generated evaluation.',
  };
};

export const buildCoachReply = ({ user, message }) => {
  const userSkills = normalize(user?.skills).slice(0, 5);
  const roleFocus = userSkills.length > 0 ? userSkills.join(', ') : 'core product skills';
  const question = String(message).toLowerCase();
  let answer = `A good next step is to review the most relevant roles, compare your current strengths, and target the gaps with a small set of focused projects or certifications.`;

  if (question.includes('priority') || question.includes('prioritize')) {
    answer = `Focus first on roles that match your strongest skills: ${roleFocus}. Prioritize internships and early-career roles where the top requirements overlap with your current experience.`;
  } else if (question.includes('missing') || question.includes('skill')) {
    answer = `Your biggest gains will likely come from building depth in system design, debugging, and communication. Review the job descriptions you are targeting and compare them to your current skill stack.`;
  } else if (question.includes('resume')) {
    answer = `Keep your resume outcome-focused, quantify impact, and align keywords with the role. Add one strong project and match the language used in the target job description.`;
  } else if (question.includes('prepare') || question.includes('interview')) {
    answer = `Practice concise product and technical storytelling. Prepare 2 strong project narratives, 3 common behavioral stories, and a short explanation of your recent engineering decisions.`;
  }

  return {
    answer,
    provider: 'heuristic',
    generatedByAI: false,
    disclaimer: 'Local coaching template. Not an AI-generated evaluation.',
  };
};

export const createProviders = () => {
  const gemini = new GeminiProvider();
  return [gemini];
};

const runWithProviders = async (invoke, customProviders = null) => {
  const providers = customProviders || createProviders();
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const response = await invoke(provider);
    if (response) return response;
  }
  return null;
};

export const analyzeJobMatch = async ({ user, job }, options = {}) => {
  try {
    const response = await runWithProviders(
      (provider) => provider.analyzeJobMatch({ user, job }),
      options.providers
    );
    if (response) return response;
  } catch (error) {
    console.warn('AI provider failed; falling back to heuristic analysis.', error.message);
  }
  return buildHeuristicMatch({ user, job });
};

export const getCoachAdvice = async ({ user, message, history = [] }, options = {}) => {
  try {
    const response = await runWithProviders(
      (provider) => provider.getCoachAdvice({ user, message, history }),
      options.providers
    );
    if (response) return response;
  } catch (error) {
    console.warn('AI coach provider failed; using local coaching guidance.', error.message);
  }
  return buildCoachReply({ user, message });
};

export const analyzeResume = async ({ user }, options = {}) => {
  const response = await runWithProviders(
    (provider) => provider.analyzeResume({ user }),
    options.providers
  );
  if (response) return response;
  return {
    provider: 'heuristic',
    strengths: normalize(user?.skills).slice(0, 5),
    skillGaps: [],
    suggestions: ['Add measurable outcomes to recent projects and keep the skill list aligned with target roles.'],
    summary: 'Local profile review only. Configure an AI provider for a deeper skill-gap analysis.',
    generatedByAI: false,
    disclaimer: 'Heuristic profile review. Not an AI-generated evaluation.',
  };
};

export const getCareerRoadmap = async ({ user, goal }, options = {}) => {
  const response = await runWithProviders(
    (provider) => provider.getCareerRoadmap({ user, goal }),
    options.providers
  );
  if (response) return response;
  return {
    provider: 'heuristic',
    title: 'Foundational learning path',
    steps: [
      { title: 'Map target roles', detail: 'Collect 5 job descriptions and list overlapping requirements.' },
      { title: 'Close one skill gap', detail: 'Pick the most common missing skill and complete a small project with it.' },
    ],
    summary: 'Local roadmap fallback. Configure Gemini for a personalized plan.',
    generatedByAI: false,
    disclaimer: 'Heuristic guidance. Not an AI-generated evaluation.',
  };
};

export const getInterviewPrep = async ({ user, job, answer }, options = {}) => {
  const response = await runWithProviders(
    (provider) => provider.getInterviewPrep({ user, job, answer }),
    options.providers
  );
  if (response) return response;
  return {
    provider: 'heuristic',
    questions: [
      'Tell me about a project you owned from idea to delivery.',
      'How do you debug a production issue under time pressure?',
    ],
    feedback: answer
      ? 'Use a situation-action-result structure and quantify impact where you can.'
      : 'Prepare two project stories before the interview.',
    focusAreas: ['communication', 'problem solving'],
    generatedByAI: false,
    disclaimer: 'Heuristic interview practice. Not an AI-generated evaluation.',
  };
};
