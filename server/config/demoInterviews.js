let demoInterviews = [];

export const clearDemoInterviews = () => {
  demoInterviews = [];
};

export const getDemoInterviewsStore = () => demoInterviews;

export const findDemoInterviewsByUser = (userId, { status, upcomingOnly = false } = {}) => {
  const uid = String(userId);
  let list = demoInterviews.filter((item) => String(item.user) === uid);

  if (status) {
    const s = String(status).toUpperCase();
    list = list.filter((item) => String(item.status).toUpperCase() === s);
  }

  if (upcomingOnly) {
    const now = Date.now();
    list = list.filter(
      (item) => item.status !== 'CANCELLED' && new Date(item.startTime).getTime() >= now
    );
  }

  list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return list;
};

export const findDemoInterviewsByApplication = (applicationId, userId) => {
  const appId = String(applicationId);
  const uid = userId ? String(userId) : null;
  return demoInterviews
    .filter(
      (item) =>
        String(item.application) === appId && (!uid || String(item.user) === uid)
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

export const findDemoInterviewById = (id, userId) => {
  const iid = String(id);
  const uid = userId ? String(userId) : null;
  return (
    demoInterviews.find(
      (item) => String(item._id) === iid && (!uid || String(item.user) === uid)
    ) || null
  );
};

export const createDemoInterview = (data) => {
  const now = new Date();
  const newInterview = {
    _id: String(
      data._id ||
        `demo-interview-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    ),
    user: String(data.user),
    application: String(data.application),
    title: data.title || '',
    type: data.type || 'Video',
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : null,
    timezone: data.timezone || 'UTC',
    meetingUrl: data.meetingUrl || '',
    location: data.location || '',
    interviewer: {
      name: data.interviewer?.name || (typeof data.interviewer === 'string' ? data.interviewer : ''),
      email: data.interviewer?.email || '',
      title: data.interviewer?.title || '',
    },
    notes: data.notes || '',
    status: data.status || 'SCHEDULED',
    reminderPreferences: {
      '3d': data.reminderPreferences?.['3d'] !== false,
      '1d': data.reminderPreferences?.['1d'] !== false,
      '6h': data.reminderPreferences?.['6h'] !== false,
      '1h': data.reminderPreferences?.['1h'] !== false,
    },
    reminders: (data.reminders || []).map((r, idx) => ({
      _id: r._id || `demo-rem-${idx}-${Date.now()}`,
      interval: r.interval,
      dueTime: new Date(r.dueTime),
      enabled: r.enabled !== false,
      status: r.status || 'SCHEDULED',
      jobId: r.jobId || '',
      sentAt: r.sentAt ? new Date(r.sentAt) : null,
      error: r.error || null,
      attempts: r.attempts || 0,
      resendId: r.resendId || null,
    })),
    cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null,
    rescheduledAt: data.rescheduledAt ? new Date(data.rescheduledAt) : null,
    rescheduledFrom: data.rescheduledFrom || null,
    rescheduledTo: data.rescheduledTo || null,
    createdAt: now,
    updatedAt: now,
  };

  demoInterviews.unshift(newInterview);
  return newInterview;
};

export const updateDemoInterview = (id, updates, userId) => {
  const interview = findDemoInterviewById(id, userId);
  if (!interview) return null;

  Object.assign(interview, updates, { updatedAt: new Date() });
  return interview;
};

export const deleteDemoInterview = (id, userId) => {
  const index = demoInterviews.findIndex(
    (item) =>
      String(item._id) === String(id) && (!userId || String(item.user) === String(userId))
  );
  if (index === -1) return false;
  demoInterviews.splice(index, 1);
  return true;
};
