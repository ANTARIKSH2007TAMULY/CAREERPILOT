const normalizeSkills = (skills = []) => skills.map((skill) => String(skill).trim().toLowerCase());

export const getRecommendedJobs = ({ userSkills = [], jobs = [] }) => {
  const normalizedUserSkills = normalizeSkills(userSkills);

  return [...jobs]
    .map((job) => {
      const jobSkills = normalizeSkills(job.skills || []);
      const overlap = jobSkills.filter((skill) => normalizedUserSkills.includes(skill));
      const matchScore = Math.min(98, Math.max(40, Math.round((overlap.length / Math.max(jobSkills.length, 1)) * 100)));

      return {
        ...job.toObject?.() || job,
        matchScore,
        overlap,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
};
