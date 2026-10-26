import api from './api';

export const calendarService = {
  getStatus: () => api.get('/integrations/google/status'),
  connect: () => api.get('/integrations/google/connect'),
  disconnect: () => api.post('/integrations/google/disconnect'),
  test: () => api.get('/integrations/google/test'),
  getEvents: (params) => api.get('/integrations/google/events', { params }),
};

export default calendarService;
