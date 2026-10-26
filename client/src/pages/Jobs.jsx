import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  DollarSign,
  Filter,
  GraduationCap,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import JobCard from '../components/jobs/JobCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import SkeletonCard from '../components/ui/SkeletonCard';
import api from '../services/api';
import { jobService } from '../services/jobService';

const DEFAULT_FILTERS = {
  keyword: '',
  location: '',
  jobType: '',
  workMode: '',
  experienceLevel: '',
  source: '',
  sort: 'newest',
};

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState(() => ({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    jobType: searchParams.get('jobType') || '',
    workMode: searchParams.get('workMode') || '',
    experienceLevel: searchParams.get('experienceLevel') || '',
    source: searchParams.get('source') || '',
    sort: searchParams.get('sort') || 'newest',
  }));

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    jobType: searchParams.get('jobType') || '',
    workMode: searchParams.get('workMode') || '',
    experienceLevel: searchParams.get('experienceLevel') || '',
    source: searchParams.get('source') || '',
    sort: searchParams.get('sort') || 'newest',
  }));

  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    limit: 12,
    total: 0,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [savingJobId, setSavingJobId] = useState(null);
  const [trackedMap, setTrackedMap] = useState({});
  const [providers, setProviders] = useState([]);

  const resultsRef = useRef(null);
  const requestSeqRef = useRef(0);
  const isInitialMount = useRef(true);

  // Sync state with URL params
  const syncUrlParams = useCallback(
    (paramsToSync, pageToSync) => {
      const next = {};
      if (paramsToSync.keyword) next.keyword = paramsToSync.keyword;
      if (paramsToSync.location) next.location = paramsToSync.location;
      if (paramsToSync.jobType) next.jobType = paramsToSync.jobType;
      if (paramsToSync.workMode) next.workMode = paramsToSync.workMode;
      if (paramsToSync.experienceLevel) next.experienceLevel = paramsToSync.experienceLevel;
      if (paramsToSync.source) next.source = paramsToSync.source;
      if (paramsToSync.sort && paramsToSync.sort !== 'newest') next.sort = paramsToSync.sort;
      if (pageToSync > 1) next.page = String(pageToSync);
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  // Load jobs from API with race condition protection
  const fetchJobs = useCallback(
    async (paramsToFetch, pageToFetch = 1) => {
      const currentSeq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);

      // Omit 'All' values so backend receives clean params
      const cleanParams = {
        page: pageToFetch,
        limit: 12,
        sort: paramsToFetch.sort || 'newest',
      };

      if (paramsToFetch.keyword?.trim()) cleanParams.keyword = paramsToFetch.keyword.trim();
      if (paramsToFetch.location?.trim()) cleanParams.location = paramsToFetch.location.trim();
      if (paramsToFetch.jobType && paramsToFetch.jobType !== 'All') cleanParams.jobType = paramsToFetch.jobType;
      if (paramsToFetch.workMode && paramsToFetch.workMode !== 'All') cleanParams.workMode = paramsToFetch.workMode;
      if (paramsToFetch.experienceLevel && paramsToFetch.experienceLevel !== 'All') cleanParams.experienceLevel = paramsToFetch.experienceLevel;
      if (paramsToFetch.source && paramsToFetch.source !== 'All') cleanParams.source = paramsToFetch.source;

      try {
        const response = await jobService.getJobs(cleanParams);
        if (currentSeq !== requestSeqRef.current) {
          // Discard stale response
          return;
        }
        const resData = response.data;
        const jobList = resData?.jobs || resData?.data?.jobs || [];
        const paginationData = resData?.pagination || resData?.data?.pagination || {
          page: pageToFetch,
          limit: 12,
          total: jobList.length,
          totalItems: jobList.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };

        setJobs(jobList);
        setPagination(paginationData);
        setProviders(resData?.providers || resData?.data?.providers || []);
        setCurrentPage(pageToFetch);
        syncUrlParams(paramsToFetch, pageToFetch);
      } catch (err) {
        if (currentSeq !== requestSeqRef.current) return;
        console.error('Failed to load jobs:', err.message);
        setError('Unable to load jobs right now. Please try again.');
      } finally {
        if (currentSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [syncUrlParams]
  );

  // Initial load & fetch saved jobs & tracked applications
  useEffect(() => {
    fetchJobs(appliedFilters, currentPage);

    api.get('/saved-jobs')
      .then((res) => {
        const savedList = res.data?.data?.jobs || res.data?.jobs || [];
        const ids = [];
        savedList.forEach((j) => {
          if (!j) return;
          if (typeof j === 'string') {
            ids.push(j);
            return;
          }
          if (j._id) ids.push(String(j._id));
          if (j.savedJobId) ids.push(String(j.savedJobId));
          if (j.providerJobId) ids.push(String(j.providerJobId));
          if (j.sourceUrl) ids.push(String(j.sourceUrl));
          if (j.applyUrl) ids.push(String(j.applyUrl));
          if (j.job?._id) ids.push(String(j.job._id));
          if (j.job?.providerJobId) ids.push(String(j.job.providerJobId));
          if (j.job?.sourceUrl) ids.push(String(j.job.sourceUrl));
        });
        setSavedIds([...new Set(ids)]);
      })
      .catch(() => {});

    api.get('/applications')
      .then((res) => {
        const appList = res.data?.data?.applications || [];
        const map = {};
        appList.forEach((app) => {
          const status = app.status === 'SAVED' ? 'INTERESTED' : app.status;
          if (app.job?._id) map[app.job._id] = status;
          if (app.providerJobId) map[app.providerJobId] = status;
          if (app.applyUrl) map[app.applyUrl] = status;
          if (app.jobTitle && app.company) {
            map[`${app.jobTitle.toLowerCase()}_${app.company.toLowerCase()}`] = status;
          }
        });
        setTrackedMap(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll live ingestion status if any provider is actively running
  useEffect(() => {
    const hasRunningProvider = providers.some((p) => p.status === 'running' || p.truncated);
    if (!hasRunningProvider) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get('/jobs/ingestion-status');
        const liveMap = res.data?.providers;
        if (liveMap) {
          const updatedProviders = Object.entries(liveMap).map(([name, s]) => ({
            name,
            configured: s.configured,
            operational: s.operational,
            status: s.status,
            count: s.ingestedTotal,
            ingested: s.ingestedTotal,
            reportedTotal: s.reportedTotal,
            truncated: s.status === 'running',
            pagesRequested: s.pagesRequested,
            accessibleLimit: s.accessibleLimit,
            message: s.message,
          }));
          setProviders(updatedProviders);

          const stillRunning = updatedProviders.some((p) => p.status === 'running');
          if (!stillRunning) {
            clearInterval(interval);
            fetchJobs(appliedFilters, currentPage);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [providers, appliedFilters, currentPage, fetchJobs]);

  // Debounced search for keyword & location
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const kwChanged = (filters.keyword || '') !== (appliedFilters.keyword || '');
      const locChanged = (filters.location || '') !== (appliedFilters.location || '');
      if (kwChanged || locChanged) {
        setAppliedFilters(filters);
        fetchJobs(filters, 1);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [filters.keyword, filters.location, filters, appliedFilters, fetchJobs]);

  // Handle Search Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Immediate filter dropdown change (resets to page 1)
  const handleDropdownFilter = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    setAppliedFilters(updated);
    fetchJobs(updated, 1);
  };

  // Submit Search form
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters(filters);
    fetchJobs(filters, 1);
  };

  // Clear single filter
  const handleRemoveFilter = (filterKey) => {
    const updated = { ...filters, [filterKey]: '' };
    setFilters(updated);
    setAppliedFilters(updated);
    fetchJobs(updated, 1);
  };

  // Clear all filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    fetchJobs(DEFAULT_FILTERS, 1);
  };

  // Pagination page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) return;
    fetchJobs(appliedFilters, newPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Helper to check if a job is saved across all possible identifier keys
  const isJobSaved = (job) => {
    if (!job) return false;
    return Boolean(
      (job._id && savedIds.includes(String(job._id))) ||
      (job.providerJobId && savedIds.includes(String(job.providerJobId))) ||
      (job.sourceUrl && savedIds.includes(String(job.sourceUrl))) ||
      (job.applyUrl && savedIds.includes(String(job.applyUrl)))
    );
  };

  // Toggle Save / Unsave
  const handleToggleSaveJob = async (jobId, job) => {
    const jobObj = job || jobs.find((j) => j._id === jobId) || { _id: jobId };
    const idToUse = jobId || jobObj._id || jobObj.providerJobId || jobObj.sourceUrl;
    if (!idToUse || savingJobId === idToUse) return;
    setSavingJobId(idToUse);

    const isCurrentlySaved = isJobSaved(jobObj);
    const jobKeys = [
      idToUse,
      jobObj._id,
      jobObj.providerJobId,
      jobObj.sourceUrl,
      jobObj.applyUrl,
    ].filter(Boolean).map(String);

    try {
      if (isCurrentlySaved) {
        await api.delete(`/saved-jobs/${encodeURIComponent(idToUse)}`);
        setSavedIds((prev) => prev.filter((id) => !jobKeys.includes(id)));
      } else {
        await api.post(`/saved-jobs/${encodeURIComponent(idToUse)}`, { job: jobObj });
        setSavedIds((prev) => [...new Set([...prev, ...jobKeys])]);
      }
    } catch (err) {
      console.error('Error toggling saved job:', err);
    } finally {
      setSavingJobId(null);
    }
  };

  // Track / Update Application
  const handleTrackJob = async (job, status = 'INTERESTED') => {
    if (!job) return;
    try {
      await api.post('/applications', {
        jobId: job._id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        applyUrl: job.applyUrl || job.sourceUrl,
        providerJobId: job.providerJobId,
        source: job.source,
        status,
      });

      const key = `${(job.title || '').toLowerCase()}_${(job.company || '').toLowerCase()}`;
      setTrackedMap((prev) => ({
        ...prev,
        [job._id]: status,
        ...(job.providerJobId ? { [job.providerJobId]: status } : {}),
        ...(job.sourceUrl ? { [job.sourceUrl]: status } : {}),
        [key]: status,
      }));
    } catch (err) {
      console.error('Failed to track job:', err);
    }
  };

  // Compute active filters for chip display
  const activeChips = [
    appliedFilters.keyword ? { key: 'keyword', label: `Keyword: "${appliedFilters.keyword}"` } : null,
    appliedFilters.location ? { key: 'location', label: `Location: ${appliedFilters.location}` } : null,
    appliedFilters.jobType && appliedFilters.jobType !== 'All' ? { key: 'jobType', label: appliedFilters.jobType } : null,
    appliedFilters.workMode && appliedFilters.workMode !== 'All' ? { key: 'workMode', label: appliedFilters.workMode } : null,
    appliedFilters.experienceLevel && appliedFilters.experienceLevel !== 'All' ? { key: 'experienceLevel', label: appliedFilters.experienceLevel } : null,
    appliedFilters.source && appliedFilters.source !== 'All' ? { key: 'source', label: `Source: ${appliedFilters.source}` } : null,
  ].filter(Boolean);

  // Compute pagination range display numbers
  const totalCount = pagination.total || pagination.totalItems || jobs.length;
  const startItem = totalCount > 0 ? (currentPage - 1) * (pagination.limit || 12) + 1 : 0;
  const endItem = Math.min(currentPage * (pagination.limit || 12), totalCount);

  const getPageNumbers = () => {
    const total = pagination.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('dots-1');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(total - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 2) pages.push('dots-2');
    pages.push(total);
    return pages;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <PageHeader
        badge="Job Catalog"
        badgeIcon={Compass}
        title="Discover Opportunities"
        description="Search aggregated jobs from global providers. Filter by work mode, contract type, and experience."
      />

      {/* Main Search & Filter Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Row 1: Keyword, Location, Search Button */}
          <div className="grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-6 lg:col-span-5">
              <label htmlFor="job-keyword-input" className="sr-only">
                Job Title or Keyword
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                id="job-keyword-input"
                name="keyword"
                value={filters.keyword}
                onChange={handleInputChange}
                placeholder="Search job title, skills, or company (e.g. React, ML, Product)"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="relative md:col-span-4 lg:col-span-4">
              <label htmlFor="job-location-input" className="sr-only">
                Location
              </label>
              <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                id="job-location-input"
                name="location"
                value={filters.location}
                onChange={handleInputChange}
                placeholder="City, state, or Remote"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2 md:col-span-2 lg:col-span-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Search}
                className="w-full"
              >
                Search
              </Button>
            </div>
          </div>

          {/* Row 2: Filter Selects */}
          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4 lg:grid-cols-5">
            {/* Job Type */}
            <div>
              <label htmlFor="filter-job-type" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Job Type
              </label>
              <select
                id="filter-job-type"
                name="jobType"
                value={filters.jobType}
                onChange={(e) => handleDropdownFilter('jobType', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition focus:border-brand-500"
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label htmlFor="filter-work-mode" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Work Mode
              </label>
              <select
                id="filter-work-mode"
                name="workMode"
                value={filters.workMode}
                onChange={(e) => handleDropdownFilter('workMode', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition focus:border-brand-500"
              >
                <option value="">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Unspecified">Unspecified</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label htmlFor="filter-experience" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Experience
              </label>
              <select
                id="filter-experience"
                name="experienceLevel"
                value={filters.experienceLevel}
                onChange={(e) => handleDropdownFilter('experienceLevel', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition focus:border-brand-500"
              >
                <option value="">All Levels</option>
                <option value="Entry">Entry Level</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior Level</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label htmlFor="filter-source" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Source
              </label>
              <select
                id="filter-source"
                name="source"
                value={filters.source}
                onChange={(e) => handleDropdownFilter('source', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition focus:border-brand-500"
              >
                <option value="">All Sources</option>
                <option value="Adzuna">Adzuna</option>
                <option value="The Muse">The Muse</option>
                <option value="Remotive">Remotive</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="filter-sort" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sort By
              </label>
              <select
                id="filter-sort"
                name="sort"
                value={filters.sort}
                onChange={(e) => handleDropdownFilter('sort', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition focus:border-brand-500"
              >
                <option value="newest">Newest first</option>
                <option value="salary">Highest salary</option>
                <option value="title">Job title (A-Z)</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </form>

        {/* Active Filter Chips */}
        {activeChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-navy-700/80 pt-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active filters:</span>
            {activeChips.map((chip) => (
              <Badge key={chip.key} variant="brand" size="sm">
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(chip.key)}
                  className="rounded-full p-0.5 hover:bg-brand-500/20 hover:text-white transition"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:text-brand-600 dark:hover:text-brand-300 ml-1"
            >
              <RotateCcw className="h-3 w-3" /> Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* Results Header & Count */}
      <div ref={resultsRef} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-navy-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-navy-700">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </div>
          <div>
            {loading ? (
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            ) : totalCount > 0 ? (
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of{' '}
                <span className="text-brand-600 dark:text-brand-400">{totalCount.toLocaleString()}</span> opportunities
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">0 jobs found</span>
            )}
          </div>
        </div>

        {pagination.totalPages > 1 && !loading ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        ) : null}
      </div>

      {/* Main Body: Loading / Error / Empty / Grid */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to retrieve jobs</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={() => fetchJobs(appliedFilters, currentPage)}
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No opportunities found"
          description="Try broadening your search keyword, changing the location, or clearing specific filters."
          action={
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleResetFilters}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const key = `${(job.title || '').toLowerCase()}_${(job.company || '').toLowerCase()}`;
            const trackedStatus =
              trackedMap[job._id] ||
              (job.providerJobId ? trackedMap[job.providerJobId] : null) ||
              (job.sourceUrl ? trackedMap[job.sourceUrl] : null) ||
              trackedMap[key] ||
              null;

            return (
              <JobCard
                key={job._id || job.sourceUrl || job.applyUrl}
                job={job}
                isSaved={isJobSaved(job)}
                isSaving={savingJobId === job._id || savingJobId === job.providerJobId || savingJobId === job.sourceUrl}
                onSave={handleToggleSaveJob}
                trackedStatus={trackedStatus}
                onTrack={handleTrackJob}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && pagination.totalPages > 1 ? (
        <nav
          aria-label="Jobs pagination"
          className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 dark:border-navy-700/80 pt-6"
        >
          {/* Previous Page Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            icon={ChevronLeft}
          >
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, idx) => {
              if (typeof pageNum === 'string') {
                return (
                  <span key={`${pageNum}-${idx}`} className="px-2 text-xs text-slate-400 dark:text-slate-500">
                    •••
                  </span>
                );
              }

              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-9 min-w-[36px] rounded-xl px-2.5 text-xs font-bold transition ${
                    isCurrent
                      ? 'border border-brand-500/40 bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xs'
                      : 'border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-navy-600 hover:bg-slate-50 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white shadow-xs'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages}
            icon={ChevronRight}
            iconPosition="right"
          >
            <span className="hidden sm:inline">Next</span>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
