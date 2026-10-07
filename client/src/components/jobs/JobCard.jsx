import { ArrowRight, BriefcaseBusiness, ExternalLink, MapPin, Save, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function JobCard({ job, onSave, isSaved }) {
  const logo = job.companyLogo || job.company?.slice(0, 2).toUpperCase();

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sm font-semibold text-sky-200 ring-1 ring-sky-500/30">
            {logo}
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{job.company}</div>
            <h3 className="mt-1 text-lg font-semibold text-white">{job.title}</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSave?.(job._id)}
          className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
          aria-label="Save job"
        >
          <Save className={`h-4 w-4 ${isSaved ? 'fill-sky-400 text-sky-400' : ''}`} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> {job.jobType}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1"><Sparkles className="h-3.5 w-3.5" /> {job.workMode}</span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-slate-400">{job.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.skills || []).slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-300">AI Match {job.matchScore || 86}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/jobs/${job._id}`} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500">
            Details
          </Link>
          <a href={job.applyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400">
            Apply <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
