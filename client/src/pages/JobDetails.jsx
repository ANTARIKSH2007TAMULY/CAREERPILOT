import { BriefcaseBusiness, CalendarDays, ExternalLink, MapPin, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MatchPanel from '../components/ai/MatchPanel';
import LoadingState from '../components/ui/LoadingState';
import { aiService } from '../services/aiService';
import api from '../services/api';
import { jobService } from '../services/jobService';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await jobService.getJobById(id);
        setJob(response.data?.data?.job || null);
        const analysisResponse = await aiService.getJobMatch({ jobId: id });
        setMatch(analysisResponse.data?.data || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    try {
      await api.post(`/saved-jobs/${job._id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTrackApplication = async () => {
    if (!job) return;
    try {
      await api.post('/applications', { jobId: job._id, status: 'SAVED' });
      navigate('/applications');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingState label="Loading role details…" />;
  }

  if (!job) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">Role not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{job.company}</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{job.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-2 py-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-2 py-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> {job.jobType}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-2 py-1"><Sparkles className="h-3.5 w-3.5" /> {job.workMode}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 hover:border-slate-500 disabled:opacity-60">
              <Save className="h-4 w-4" /> Save job
            </button>
            <a href={job.applyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Apply on company site <ExternalLink className="h-4 w-4" />
            </a>
            <button type="button" onClick={handleTrackApplication} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 hover:border-slate-500">
              Track application
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-lg font-semibold text-white">Role overview</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Salary</div>
                <div className="mt-2 text-base font-medium text-white">{job.salary || 'Negotiable'}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Deadline</div>
                <div className="mt-2 text-base font-medium text-white">{job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Flexible'}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium text-white">Skills</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(job.skills || []).map((skill) => (
                  <span key={skill} className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-lg font-semibold text-white">Description</div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">{job.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <MatchPanel match={match} />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-lg font-semibold text-white">Role info</div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span>Source</span>
                <span>{job.source}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span>Experience</span>
                <span>{job.experienceLevel}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span>Work mode</span>
                <span>{job.workMode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Company site</span>
                <a href={job.applyUrl} target="_blank" rel="noreferrer" className="text-sky-300">Open</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
