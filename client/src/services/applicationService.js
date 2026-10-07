import api from './api';

export const applicationService = {
  getApplications: () => api.get('/applications'),
  createApplication: (payload) => api.post('/applications', payload),
  updateApplication: (id, payload) => api.patch(`/applications/${id}`, payload),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
};
