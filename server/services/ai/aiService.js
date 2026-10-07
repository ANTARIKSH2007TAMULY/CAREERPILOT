import env from '../../config/env.js';
import GeminiProvider from './geminiProvider.js';
import GrokProvider from './grokProvider.js';

const normalize = (value) => (Array.isArray(value) ? value : []);

const buildHeuristicMatch = ({ user, job }) => {
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
  };
};

const buildCoachReply = ({ user, message }) => {
  const userSkills = normalize(user?.skills).slice(0, 5);
  const roleFocus = userSkills.length > 0 ? userSkills.join(', ') : 'core product skills';
  const question = String(message).toLowerCase();

  if (question.includes('priority') || question.includes('prioritize')) {
    return `Focus first on roles that match your strongest skills: ${roleFocus}. Prioritize internships and early-career roles where the top requirements overlap with your current experience.`;
  }

  if (question.includes('missing') || question.includes('skill')) {
    return `Your biggest gains will likely come from building depth in system design, debugging, and communication. Review the job descriptions you are targeting and compare them to your current skill stack.`;
  }

  if (question.includes('resume')) {
    return `Keep your resume outcome-focused, quantify impact, and align keywords with the role. Add one strong project and match the language used in the target job description.`;
  }

  if (question.includes('prepare') || question.includes('interview')) {
    return `Practice concise product and technical storytelling. Prepare 2 strong project narratives, 3 common behavioral stories, and a short explanation of your recent engineering decisions.`;
  }

  return `A good next step is to review the most relevant roles, compare your current strengths, and target the gaps with a small set of focused projects or certifications.`;
};

export const analyzeJobMatch = async ({ user, job }) => {
  try {
    const providerCandidates = [
      new GeminiProvider(env.geminiApiKey),
      new GrokProvider(env.grokApiKey),
    ];

    for (const provider of providerCandidates) {
      const response = await provider.analyzeJobMatch({ user, job });
      if (response) return response;
    }
  } catch (error) {
    console.warn('AI provider failed; falling back to heuristic analysis.', error.message);
  }

  return buildHeuristicMatch({ user, job });
};

export const getCoachAdvice = async ({ user, message }) => {
  try {
    const providerCandidates = [
      new GeminiProvider(env.geminiApiKey),
      new GrokProvider(env.grokApiKey),
    ];

    for (const provider of providerCandidates) {
      if (provider && typeof provider.getCoachAdvice === 'function') {
        const response = await provider.getCoachAdvice({ user, message });
        if (response) return response;
      }
    }
  } catch (error) {
    console.warn('AI coach provider failed; using local coaching guidance.', error.message);
  }

  return buildCoachReply({ user, message });
};
