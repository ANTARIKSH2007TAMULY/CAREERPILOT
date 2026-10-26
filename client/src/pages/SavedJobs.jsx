import {
  Archive,
  BookmarkCheck,
  Briefcase,
  Building2,
  Check,
  ExternalLink,
  MapPin,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import api from '../services/api';

export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const [trackedMap, setTrackedMap] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saved-jobs');
      setJobs(response.data?.data?.jobs || []);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
      showToast('Failed to load saved jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackedApplications = async () => {
    try {
      const res = await api.get('/applications');
      const apps = res.data?.data?.applications || [];
      const map = {};
      apps.forEach((app) => {
        const status = app.status === 'SAVED' ? 'INTERESTED' : app.status;
        if (app.job?._id) map[app.job._id] = status;
        if (app.providerJobId) map[app.providerJobId] = status;
        if (app.applyUrl) map[app.applyUrl] = status;
        if (app.jobTitle && app.company) {
          map[`${app.jobTitle.toLowerCase()}_${app.company.toLowerCase()}`] = status;
        }
      });
      setTrackedMap(map);
    } catch (error) {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchSavedJobs();
    fetchTrackedApplications();
  }, []);

  const removeSaved = async (job) => {
    const idToDelete = job.savedJobId || job._id;
    setRemovingId(idToDelete);
    try {
      await api.delete(`/saved-jobs/${encodeURIComponent(idToDelete)}`);
      setJobs((current) => current.filter((j) => (j.savedJobId || j._id) !== idToDelete));
      showToast('Role removed from saved list');
    } catch (error) {
      console.error('Failed to remove saved job:', error);
      showToast('Failed to remove saved job.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleTrackRole = async (job) => {
    const idToTrack = job.savedJobId || job._id;
    setTrackingId(idToTrack);
    try {
      await api.post('/applications', {
        jobId: job.isArchived ? undefined : job._id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        applyUrl: job.applyUrl || job.sourceUrl,
        providerJobId: job.providerJobId,
        source: job.source,
        status: 'INTERESTED',
      });
      const key = `${(job.title || '').toLowerCase()}_${(job.company || '').toLowerCase()}`;
      setTrackedMap((prev) => ({
        ...prev,
        [job._id]: 'INTERESTED',
        ...(job.providerJobId ? { [job.providerJobId]: 'INTERESTED' } : {}),
        ...(job.applyUrl ? { [job.applyUrl]: 'INTERESTED' } : {}),
        [key]: 'INTERESTED',
      }));
      showToast(`Added "${job.title}" to Tracker under Interested!`);
    } catch (error) {
      console.error('Failed to track role:', error);
      showToast(error.response?.data?.message || 'Failed to add role to tracker', 'error');
    } finally {
      setTrackingId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading saved roles…" />;
  }

  const filteredJobs = jobs.filter((job) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const titleMatch = (job.title || '').toLowerCase().includes(q);
    const companyMatch = (job.company || '').toLowerCase().includes(q);
    const locationMatch = (job.location || '').toLowerCase().includes(q);
    return titleMatch || companyMatch || locationMatch;
  });

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        category="Shortlist"
        categoryIcon={BookmarkCheck}
        title="Saved jobs"
        description="Your curated library of prospective opportunities ready for review and tracking."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button variant="accent">
                Discover More Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {jobs.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-3.5 shadow-xs dark:shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortlisted roles by title, company, or location…"
              className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 self-center sm:self-auto px-1">
            Showing <span className="font-bold text-slate-900 dark:text-slate-200">{filteredJobs.length}</span> of {jobs.length} saved
          </div>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="No saved roles yet"
          description="Bookmark promising jobs while browsing to keep your opportunities organized and ready for application."
          action={
            <Link to="/jobs">
              <Button variant="primary">
                Discover Open Opportunities
              </Button>
            </Link>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-navy-700 bg-white/40 dark:bg-navy-900/40 p-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No saved roles match "{search}".</p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => {
            const initial = (job.company || 'J').charAt(0).toUpperCase();
            const key = `${(job.title || '').toLowerCase()}_${(job.company || '').toLowerCase()}`;
            const trackedStatus =
              trackedMap[job._id] ||
              (job.providerJobId ? trackedMap[job.providerJobId] : null) ||
              (job.applyUrl ? trackedMap[job.applyUrl] : null) ||
              trackedMap[key] ||
              null;

            return (
              <div
                key={job.savedJobId || job._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card transition-all duration-200 hover:border-slate-300 dark:hover:border-navy-600 hover:shadow-md dark:hover:shadow-card-hover"
              >
                <div>
                  {/* Top Bar: Company & Remove Action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-gradient-to-br dark:from-brand-600/30 dark:to-slate-800 text-sm font-bold text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/20">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate block">
                          {job.company || 'Company'}
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors truncate">
                          {job.title}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSaved(job)}
                      disabled={removingId === (job.savedJobId || job._id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Remove from saved"
                      aria-label="Remove from saved"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Badges: Location, Salary, Employment, Archived */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    {job.isArchived ? (
                      <Badge variant="default">
                        <Archive className="h-3 w-3 mr-1 inline-block" />
                        Archived Listing
                      </Badge>
                    ) : null}
                    {job.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        {job.location}
                      </span>
                    ) : null}
                    {job.workMode ? (
                      <Badge
                        variant={
                          job.workMode === 'Remote'
                            ? 'emerald'
                            : job.workMode === 'Hybrid'
                            ? 'purple'
                            : job.workMode === 'On-site'
                            ? 'accent'
                            : 'default'
                        }
                      >
                        {job.workMode}
                      </Badge>
                    ) : null}
                    {job.salary ? (
                      <Badge variant="emerald">
                        {job.salary}
                      </Badge>
                    ) : null}
                    {job.employmentType ? (
                      <Badge variant="default">
                        {job.employmentType}
                      </Badge>
                    ) : null}
                  </div>

                  {/* Skills Pills */}
                  {(job.skills || []).length > 0 ? (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 ? (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                          +{job.skills.length - 4} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Footer Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-navy-700/80 pt-3.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                    <Link
                      to={`/jobs/${job._id}`}
                      className="flex-1"
                    >
                      <Button variant="secondary" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>

                    {job.applyUrl ? (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-2 text-slate-500 hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white transition shadow-xs shrink-0"
                        title="Open external job post"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    {trackedStatus ? (
                      <Badge variant="emerald" size="sm">
                        <Check className="h-3 w-3 mr-1" /> Tracked
                      </Badge>
                    ) : (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => handleTrackRole(job)}
                        loading={trackingId === (job.savedJobId || job._id)}
                      >
                        <Briefcase className="h-3.5 w-3.5 mr-1" /> Track Role
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
