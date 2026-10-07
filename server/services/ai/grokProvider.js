const normalize = (value) => (Array.isArray(value) ? value : []);

class GrokProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async analyzeJobMatch({ user, job }) {
    if (!this.apiKey) return null;

    const userSkills = normalize(user?.skills);
    const jobSkills = normalize(job?.skills);
    const matched = jobSkills.filter((skill) => userSkills.some((item) => item.toLowerCase() === String(skill).toLowerCase()));
    const missingSkills = jobSkills.filter((skill) => !userSkills.some((item) => item.toLowerCase() === String(skill).toLowerCase()));
    const matchScore = Math.max(48, Math.min(98, Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100)));

    return {
      provider: 'grok',
      matchScore,
      strengths: matched.slice(0, 5),
      missingSkills: missingSkills.slice(0, 5),
      recommendations: missingSkills.length
        ? [`Build confidence in ${missingSkills[0]} by practicing projects and review notes.`]
        : ['This role is aligned with your current profile and experience.'],
      summary: `Grok indicates a ${matchScore}% match, with your strongest overlap in the core requirement set.`,
    };
  }
}

export default GrokProvider;
