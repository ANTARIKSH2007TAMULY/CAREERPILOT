import api from './api';

export const jobService = {
  getJobs: (params = {}) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
};
