import api from './api';

export const interviewService = {
  getUpcomingInterviews: () => api.get('/interviews/upcoming'),
  getInterviewById: (id) => api.get(`/interviews/${id}`),
  getInterviewsByApplication: (applicationId) => api.get(`/applications/${applicationId}/interviews`),
  createInterview: (applicationId, payload) => api.post(`/applications/${applicationId}/interviews`, payload),
  updateInterview: (id, payload) => api.patch(`/interviews/${id}`, payload),
  deleteInterview: (id) => api.delete(`/interviews/${id}`),
  sendTestEmail: (id) => api.post(`/interviews/${id}/test-email`),
  updateReminderPreferences: (id, reminderPreferences) =>
    api.patch(`/interviews/${id}/reminders`, { reminderPreferences }),
};

export default interviewService;
