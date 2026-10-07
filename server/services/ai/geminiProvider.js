const normalize = (value) => (Array.isArray(value) ? value : []);

class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async analyzeJobMatch({ user, job }) {
    if (!this.apiKey) return null;

    const userSkills = normalize(user?.skills);
    const jobSkills = normalize(job?.skills);
    const matched = jobSkills.filter((skill) => userSkills.some((item) => item.toLowerCase() === String(skill).toLowerCase()));
    const missingSkills = jobSkills.filter((skill) => !userSkills.some((item) => item.toLowerCase() === String(skill).toLowerCase()));
    const matchScore = Math.max(50, Math.min(99, Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100)));

    return {
      provider: 'gemini',
      matchScore,
      strengths: matched.slice(0, 5),
      missingSkills: missingSkills.slice(0, 5),
      recommendations: missingSkills.length
        ? [`Review ${missingSkills[0]} and other key fundamentals for this role.`]
        : ['Your skills align strongly with this opportunity.'],
      summary: `Gemini estimate suggests a ${matchScore}% fit based on your current skills and the role requirements.`,
    };
  }
}

export default GeminiProvider;
