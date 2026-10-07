import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import JobCard from '../components/jobs/JobCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import { jobService } from '../services/jobService';
import api from '../services/api';

const defaultFilters = {
  keyword: '',
  location: '',
  jobType: '',
  workMode: '',
  experienceLevel: '',
  skills: '',
  sort: 'newest',
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState([]);

  const loadJobs = async (params = filters, page = 1) => {
    setLoading(true);
    try {
      const response = await jobService.getJobs({ ...params, page, limit: 12 });
      const payload = response.data?.data || {};
      setJobs(payload.jobs || []);
      setPagination(payload.pagination || { page: 1, totalPages: 1, totalItems: 0, limit: 12 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    api.get('/saved-jobs')
      .then((response) => {
        const savedJobs = response.data?.data?.jobs || [];
        setSavedIds(savedJobs.map((job) => job._id));
      })
      .catch(() => {});
  }, []);

  const handleFilterChange = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    loadJobs(filters, 1);
  };

  const handleSaveJob = async (jobId) => {
    try {
      await api.post(`/saved-jobs/${jobId}`);
      setSavedIds((current) => [...new Set([...current, jobId])]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Discover</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Find your next role</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-slate-400">Keyword</label>
            <input name="keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="React, product, ML" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-slate-400">Location</label>
            <input name="location" value={filters.location} onChange={handleFilterChange} placeholder="Remote" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-slate-400">Job type</label>
            <select name="jobType" value={filters.jobType} onChange={handleFilterChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500">
              <option value="">All</option>
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-slate-400">Work mode</label>
            <select name="workMode" value={filters.workMode} onChange={handleFilterChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500">
              <option value="">All</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-slate-400">Sort</label>
            <select name="sort" value={filters.sort} onChange={handleFilterChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500">
              <option value="newest">Newest</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4" />
            {pagination.totalItems} roles found
          </div>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-slate-950 hover:bg-sky-400">
            <Search className="h-4 w-4" /> Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingState key={index} label="Searching roles…" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState title="No roles match your filters" description="Try broader keywords or remove a filter." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={{ ...job, matchScore: job.matchScore || 86 }} isSaved={savedIds.includes(job._id)} onSave={handleSaveJob} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => loadJobs(filters, pagination.page - 1)} disabled={pagination.page <= 1} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">
            Prev
          </button>
          <span className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button type="button" onClick={() => loadJobs(filters, pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
