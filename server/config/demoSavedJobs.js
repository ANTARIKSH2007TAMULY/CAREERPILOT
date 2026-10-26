let demoSavedJobs = [];

export const clearDemoSavedJobs = () => {
  demoSavedJobs = [];
};

export const getDemoSavedJobsStore = () => demoSavedJobs;

export const findDemoSavedJobsByUser = (userId) => {
  const uid = String(userId);
  return demoSavedJobs
    .filter((entry) => String(entry.user) === uid)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const matchesJobId = (entry, targetId) => {
  const target = String(targetId).trim().toLowerCase();
  if (String(entry.jobId).trim().toLowerCase() === target) return true;
  if (String(entry.job?._id).trim().toLowerCase() === target) return true;
  if (entry.job?.providerJobId && String(entry.job.providerJobId).trim().toLowerCase() === target) return true;
  if (entry.job?.sourceUrl && String(entry.job.sourceUrl).trim().toLowerCase() === target) return true;
  if (entry.job?.applyUrl && String(entry.job.applyUrl).trim().toLowerCase() === target) return true;
  return false;
};

export const createDemoSavedJob = (userId, job) => {
  const uid = String(userId);
  const jobId = String(job._id || job.id || job.providerJobId || job.sourceUrl || job);

  const existing = demoSavedJobs.find(
    (entry) => String(entry.user) === uid && (matchesJobId(entry, jobId) || (job.providerJobId && matchesJobId(entry, job.providerJobId)))
  );

  if (existing) {
    return { entry: existing, alreadySaved: true };
  }

  const newEntry = {
    _id: `demo-saved-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    user: uid,
    jobId,
    job: typeof job === 'object' ? { ...job, _id: job._id || jobId } : { _id: jobId },
    createdAt: new Date(),
  };

  demoSavedJobs.unshift(newEntry);
  return { entry: newEntry, alreadySaved: false };
};

export const deleteDemoSavedJob = (userId, jobId) => {
  const uid = String(userId);
  const jid = String(jobId);
  const initialLen = demoSavedJobs.length;

  demoSavedJobs = demoSavedJobs.filter(
    (entry) => !(String(entry.user) === uid && (matchesJobId(entry, jid) || String(entry._id) === jid))
  );

  return demoSavedJobs.length < initialLen;
};
