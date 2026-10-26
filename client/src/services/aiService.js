import api from './api';

export const aiService = {
  getUsage: () => api.get('/ai/usage'),
  getJobMatch: (payload) => api.post('/ai/job-match', payload),
  chat: (payload) => api.post('/ai/chat', payload),
  analyzeResume: (payload = {}) => api.post('/ai/resume-analysis', payload),
  getRoadmap: (payload = {}) => api.post('/ai/roadmap', payload),
  getInterviewPrep: (payload = {}) => api.post('/ai/interview-prep', payload),
};
