import api from './api';

export const applicationService = {
  getApplications: (params = {}) => api.get('/applications', { params }),
  getApplicationById: (id) => api.get(`/applications/${id}`),
  createApplication: (payload) => api.post('/applications', payload),
  updateApplication: (id, payload) => api.patch(`/applications/${id}`, payload),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
};
