import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const formatPostedDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return 'Today';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
};

export default function JobCard({
  job,
  onSave,
  isSaved,
  isSaving = false,
  trackedStatus = null,
  onTrack = null,
}) {
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [appliedPrompt, setAppliedPrompt] = useState(false);
  const postedTime = formatPostedDate(job.postedAt);

  const handleApplyClick = () => {
    if (!trackedStatus || trackedStatus === 'INTERESTED' || trackedStatus === 'SAVED') {
      setAppliedPrompt(true);
    }
  };

  const handleConfirmApplied = () => {
    onTrack?.(job, 'APPLIED');
    setAppliedPrompt(false);
  };

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-navy-600 hover:shadow-md dark:hover:shadow-card-hover">
      <div>
        {/* Top Header: Company Name, Job Title, Time, Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{job.company || 'Confidential'}</span>
            </div>
            <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 dark:text-white transition group-hover:text-brand-600 dark:group-hover:text-brand-300 font-display truncate">
              <Link to={`/jobs/${job._id}`} className="hover:underline">
                {job.title}
              </Link>
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {postedTime ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <Clock className="h-3 w-3 text-slate-400" /> {postedTime}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onSave?.(job._id, job)}
              disabled={isSaving}
              className={`rounded-xl border p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 shadow-xs ${
                isSaved
                  ? 'border-brand-500/50 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300'
                  : 'border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 text-slate-400 hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-800 dark:hover:text-white'
              }`}
              aria-label={isSaved ? 'Unsave job' : 'Save job'}
              title={isSaved ? 'Job saved' : 'Save job'}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              ) : (
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-brand-500 text-brand-500 dark:fill-brand-400 dark:text-brand-400' : ''}`} />
              )}
            </button>
          </div>
        </div>

        {/* Tracked Status Badge (if recorded in tracker) */}
        {trackedStatus ? (
          <div className="mt-2.5">
            <Badge
              variant={
                trackedStatus === 'APPLIED'
                  ? 'accent'
                  : trackedStatus === 'INTERVIEW'
                  ? 'purple'
                  : trackedStatus === 'OFFER' || trackedStatus === 'ACCEPTED'
                  ? 'emerald'
                  : 'default'
              }
              size="sm"
            >
              <Check className="h-3 w-3" /> Tracked: {trackedStatus}
            </Badge>
          </div>
        ) : null}

        {/* Badges: Location, Job Type, Work Mode, Experience */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          {job.location ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/60 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">
              <MapPin className="h-3 w-3 text-sky-500 dark:text-accent-400" /> {job.location}
            </span>
          ) : null}
          {job.jobType ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/60 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">
              <BriefcaseBusiness className="h-3 w-3 text-brand-500 dark:text-brand-400" /> {job.jobType}
            </span>
          ) : null}
          {job.workMode ? (
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                job.workMode === 'Remote'
                  ? 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : job.workMode === 'Hybrid'
                  ? 'border-purple-500/20 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : job.workMode === 'On-site'
                  ? 'border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/60 text-slate-500 dark:text-slate-400'
              }`}
            >
              {job.workMode === 'Remote' ? (
                <Sparkles className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              ) : job.workMode === 'Hybrid' ? (
                <Building2 className="h-3 w-3 text-purple-500 dark:text-purple-400" />
              ) : job.workMode === 'On-site' ? (
                <MapPin className="h-3 w-3 text-sky-500 dark:text-sky-400" />
              ) : null}
              {job.workMode}
            </span>
          ) : null}
          {job.experienceLevel ? (
            <span className="inline-flex items-center rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/60 px-2.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {job.experienceLevel}
            </span>
          ) : null}
        </div>

        {/* Salary range (if present) */}
        {job.salary ? (
          <div className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {job.salary}
          </div>
        ) : null}

        {/* Job Description excerpt */}
        {job.description ? (
          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {job.description}
          </p>
        ) : null}

        {/* Skills Pills */}
        {Array.isArray(job.skills) && job.skills.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition group-hover:border-slate-300 dark:group-hover:border-navy-600"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 ? (
              <span className="self-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                +{job.skills.length - 4} more
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* External submission return prompt */}
      {appliedPrompt ? (
        <div className="mt-3.5 rounded-xl border border-brand-500/30 bg-brand-50 dark:bg-brand-950/40 p-3 text-xs text-brand-900 dark:text-brand-200">
          <p className="font-semibold">Did you submit your application on the company site?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmApplied}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 transition shadow-xs"
            >
              Record as Applied
            </button>
            <button
              type="button"
              onClick={() => setAppliedPrompt(false)}
              className="rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : null}

      {/* Card Footer: Source / Match & Action Buttons */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-navy-700/80 pt-3.5">
        <div className="flex items-center gap-2">
          {job.source ? (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              via <span className="text-slate-800 dark:text-slate-300 font-semibold">{job.source}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Tracking Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTrackMenu(!showTrackMenu)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white shadow-xs"
            >
              <span>{trackedStatus ? 'Update' : 'Track'}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showTrackMenu ? (
              <div className="absolute right-0 bottom-9 z-30 w-44 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 py-1 shadow-2xl backdrop-blur-md animate-slide-up">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrackMenu(false);
                    onTrack?.(job, 'INTERESTED');
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
                >
                  <span>Mark as Interested</span>
                  {trackedStatus === 'INTERESTED' ? <Check className="h-3 w-3 text-brand-500" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTrackMenu(false);
                    onTrack?.(job, 'APPLIED');
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
                >
                  <span>Record as Applied</span>
                  {trackedStatus === 'APPLIED' ? <Check className="h-3 w-3 text-sky-500" /> : null}
                </button>
                <Link
                  to="/applications"
                  className="block border-t border-slate-100 dark:border-navy-700 px-3 py-1.5 text-left text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
                >
                  Open Full Tracker →
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            to={`/jobs/${job._id}`}
            className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white shadow-xs"
          >
            Details
          </Link>

          {job.applyUrl || job.sourceUrl ? (
            <a
              href={job.applyUrl || job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleApplyClick}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-brand-500 hover:to-indigo-500 transition"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
