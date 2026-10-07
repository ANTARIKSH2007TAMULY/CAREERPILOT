import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import api from '../services/api';

export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saved-jobs');
      setJobs(response.data?.data?.jobs || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const removeSaved = async (jobId) => {
    try {
      await api.delete(`/saved-jobs/${jobId}`);
      setJobs((current) => current.filter((job) => job._id !== jobId));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingState label="Loading saved jobs…" />;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No saved roles yet"
        description="Save promising jobs to keep your shortlist organized and ready for review."
        action={<Link to="/jobs" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950">Discover jobs</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Saved</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Shortlisted roles</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <div key={job._id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-soft">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{job.company}</div>
            <h2 className="mt-2 text-lg font-semibold text-white">{job.title}</h2>
            <div className="mt-3 text-sm text-slate-400">{job.location}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(job.skills || []).slice(0, 3).map((skill) => (
                <span key={skill} className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300">{skill}</span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <Link to={`/jobs/${job._id}`} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:border-slate-500">View</Link>
              <button type="button" onClick={() => removeSaved(job._id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
