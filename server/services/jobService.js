export const buildJobSearchQuery = (params = {}) => {
  const query = { ...params };

  if (!query.page) query.page = 1;
  if (!query.limit) query.limit = 12;
  if (!query.sort) query.sort = 'newest';

  return query;
};

export const normalizeJobFilters = (params = {}) => ({
  keyword: params.keyword || '',
  location: params.location || '',
  jobType: params.jobType || '',
  workMode: params.workMode || '',
  experienceLevel: params.experienceLevel || '',
  skills: params.skills || '',
  source: params.source || '',
  page: Number(params.page) || 1,
  limit: Number(params.limit) || 12,
  sort: params.sort || 'newest',
});
