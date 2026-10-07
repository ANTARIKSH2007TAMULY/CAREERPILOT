import api from './api';

export const aiService = {
  getJobMatch: (payload) => api.post('/ai/job-match', payload),
  chat: (payload) => api.post('/ai/chat', payload),
};
