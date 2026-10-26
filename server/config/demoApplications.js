let demoApplications = [];

export const clearDemoApplications = () => {
  demoApplications = [];
};

export const getDemoApplicationsStore = () => demoApplications;

export const findDemoApplicationsByUser = (userId, query = {}) => {
  const uid = String(userId);
  let list = demoApplications.filter((app) => String(app.user) === uid);

  if (query.status) {
    const s = String(query.status).toUpperCase();
    if (s === 'INTERESTED') {
      list = list.filter((app) => app.status === 'INTERESTED' || app.status === 'SAVED');
    } else {
      list = list.filter((app) => app.status === s);
    }
  }

  if (query.search) {
    const searchLower = String(query.search).toLowerCase();
    list = list.filter((app) => {
      const title = String(app.jobTitle || app.job?.title || '').toLowerCase();
      const comp = String(app.company || app.job?.company || '').toLowerCase();
      return title.includes(searchLower) || comp.includes(searchLower);
    });
  }

  const sort = query.sort || 'recent';
  list.sort((a, b) => {
    if (sort === 'appliedAt') {
      const tA = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const tB = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return tB - tA;
    }
    if (sort === 'company') {
      const cA = String(a.company || a.job?.company || '');
      const cB = String(b.company || b.job?.company || '');
      return cA.localeCompare(cB);
    }
    if (sort === 'title') {
      const tA = String(a.jobTitle || a.job?.title || '');
      const tB = String(b.jobTitle || b.job?.title || '');
      return tA.localeCompare(tB);
    }
    // recent / updatedAt (default)
    const uA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const uB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return uB - uA;
  });

  return list;
};

export const findDemoApplicationById = (id, userId) => {
  const app = demoApplications.find(
    (a) => String(a._id) === String(id) && (!userId || String(a.user) === String(userId))
  );
  return app || null;
};

export const findDemoApplicationByJobOrIdentity = (userId, { jobId, providerJobId, applyUrl, jobTitle, company }) => {
  const uid = String(userId);
  return demoApplications.find((app) => {
    if (String(app.user) !== uid) return false;
    if (jobId && app.job && String(app.job) === String(jobId)) return true;
    if (jobId && String(app.providerJobId) === String(jobId)) return true;
    if (providerJobId && String(app.providerJobId) === String(providerJobId)) return true;
    if (applyUrl && app.applyUrl && String(app.applyUrl) === String(applyUrl)) return true;
    if (
      jobTitle &&
      company &&
      String(app.jobTitle || '').toLowerCase() === String(jobTitle).toLowerCase() &&
      String(app.company || '').toLowerCase() === String(company).toLowerCase()
    ) {
      return true;
    }
    return false;
  }) || null;
};

export const createDemoApplication = (data) => {
  const now = new Date();
  const normalizedStatus = String(data.status || 'INTERESTED').toUpperCase();

  const newApp = {
    _id: String(data._id || `demo-app-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    user: String(data.user),
    job: data.job || null,
    jobTitle: data.jobTitle || data.job?.title || '',
    company: data.company || data.job?.company || '',
    companyLogo: data.companyLogo || data.job?.companyLogo || '',
    location: data.location || data.job?.location || '',
    salary: data.salary || data.job?.salary || '',
    applyUrl: data.applyUrl || data.job?.applyUrl || data.job?.sourceUrl || '',
    providerJobId: data.providerJobId || data.job?.providerJobId || '',
    source: data.source || data.job?.source || '',
    status: normalizedStatus,
    appliedAt: normalizedStatus === 'APPLIED' ? (data.appliedAt ? new Date(data.appliedAt) : now) : (data.appliedAt ? new Date(data.appliedAt) : null),
    deadline: data.deadline ? new Date(data.deadline) : null,
    interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
    offerSalary: data.offerSalary || '',
    offerDeadline: data.offerDeadline ? new Date(data.offerDeadline) : null,
    notes: data.notes || '',
    nextAction: data.nextAction || '',
    recruiter: data.recruiter || '',
    documents: Array.isArray(data.documents) ? [...data.documents] : [],
    statusHistory: [
      {
        status: normalizedStatus,
        changedAt: now,
        notes: data.notes || 'Application created',
      },
    ],
    createdAt: data.createdAt ? new Date(data.createdAt) : now,
    updatedAt: now,
  };

  demoApplications.unshift(newApp);
  return newApp;
};

export const updateDemoApplication = (id, userId, updates) => {
  const app = findDemoApplicationById(id, userId);
  if (!app) return null;

  const now = new Date();
  if (updates.status && updates.status !== app.status) {
    const nextStatus = String(updates.status).toUpperCase();
    app.statusHistory = app.statusHistory || [];
    app.statusHistory.push({
      status: nextStatus,
      changedAt: now,
      notes: updates.notes || `Status changed to ${nextStatus}`,
    });
    if (nextStatus === 'APPLIED' && !app.appliedAt) {
      app.appliedAt = now;
    }
    app.status = nextStatus;
  }

  const allowedUpdates = [
    'notes',
    'nextAction',
    'interviewDate',
    'deadline',
    'offerSalary',
    'offerDeadline',
    'recruiter',
    'documents',
    'appliedAt',
    'jobTitle',
    'company',
    'salary',
    'location',
    'applyUrl',
  ];

  for (const field of allowedUpdates) {
    if (updates[field] !== undefined) {
      if (['interviewDate', 'deadline', 'offerDeadline', 'appliedAt'].includes(field)) {
        app[field] = updates[field] ? new Date(updates[field]) : null;
      } else {
        app[field] = updates[field];
      }
    }
  }

  app.updatedAt = now;
  return app;
};

export const deleteDemoApplication = (id, userId) => {
  const initialLength = demoApplications.length;
  demoApplications = demoApplications.filter(
    (app) => !(String(app._id) === String(id) && String(app.user) === String(userId))
  );
  return demoApplications.length < initialLength;
};
