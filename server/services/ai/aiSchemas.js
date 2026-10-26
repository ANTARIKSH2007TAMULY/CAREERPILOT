const asArray = (value) => (Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []);

const asScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const MAX_AI_INPUT_CHARS = 12000;

export const truncateInput = (value = '', max = MAX_AI_INPUT_CHARS) => {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max)}\n[truncated]`;
};

export const validateJobMatch = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const matchScore = asScore(payload.matchScore);
  if (matchScore == null) return null;
  return {
    matchScore,
    strengths: asArray(payload.strengths).slice(0, 8),
    missingSkills: asArray(payload.missingSkills).slice(0, 8),
    recommendations: asArray(payload.recommendations).slice(0, 8),
    summary: String(payload.summary || '').trim(),
    generatedByAI: true,
    disclaimer: 'AI-generated suggestion. Do not treat this as verified qualifications or work history.',
  };
};

export const validateResumeAnalysis = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return {
    strengths: asArray(payload.strengths).slice(0, 8),
    skillGaps: asArray(payload.skillGaps).slice(0, 8),
    suggestions: asArray(payload.suggestions).slice(0, 8),
    summary: String(payload.summary || '').trim(),
    generatedByAI: true,
    disclaimer: 'AI-generated suggestion. This is not a verified resume audit and must not invent achievements.',
  };
};

export const validateRoadmap = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const steps = Array.isArray(payload.steps)
    ? payload.steps
        .map((step) => ({
          title: String(step?.title || '').trim(),
          detail: String(step?.detail || '').trim(),
        }))
        .filter((step) => step.title)
        .slice(0, 10)
    : [];
  return {
    title: String(payload.title || 'Learning roadmap').trim(),
    steps,
    summary: String(payload.summary || '').trim(),
    generatedByAI: true,
    disclaimer: 'AI-generated career guidance. Validate recommendations against official sources.',
  };
};

export const validateInterviewPrep = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return {
    questions: asArray(payload.questions).slice(0, 10),
    feedback: String(payload.feedback || '').trim(),
    focusAreas: asArray(payload.focusAreas).slice(0, 8),
    generatedByAI: true,
    disclaimer: 'AI-generated interview practice. It is not a real interview score.',
  };
};

export const validateCoachReply = (payload) => {
  if (typeof payload === 'string' && payload.trim()) {
    return {
      answer: payload.trim(),
      generatedByAI: true,
      disclaimer: 'AI-generated coaching. Use it as guidance, not as a guarantee.',
    };
  }
  if (!payload || typeof payload !== 'object') return null;
  const answer = String(payload.answer || payload.message || '').trim();
  if (!answer) return null;
  return {
    answer,
    generatedByAI: true,
    disclaimer: 'AI-generated coaching. Use it as guidance, not as a guarantee.',
  };
};

export const extractJson = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};
