import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Compass,
  DollarSign,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MatchPanel from '../components/ai/MatchPanel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import LoadingState from '../components/ui/LoadingState';
import { aiService } from '../services/aiService';
import api from '../services/api';
import { jobService } from '../services/jobService';

const ALL_STATUSES = [
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEW', label: 'Interview Scheduled' },
  { key: 'OFFER', label: 'Offer Received' },
  { key: 'ACCEPTED', label: 'Offer Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [trackedApp, setTrackedApp] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [trackMessage, setTrackMessage] = useState('');
  const [externalAppliedPrompt, setExternalAppliedPrompt] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await jobService.getJobById(id);
        const jobData = response.data?.data?.job || response.data?.job || null;
        setJob(jobData);

        // Fetch AI match (non-fatal)
        try {
          const analysisResponse = await aiService.getJobMatch({ jobId: id, job: jobData });
          setMatch(analysisResponse.data?.data || null);
        } catch {
          // ignore AI failure
        }

        // Check if saved
        try {
          const savedRes = await api.get('/saved-jobs');
          const savedJobs = savedRes.data?.data?.jobs || savedRes.data?.jobs || [];
          const saved = savedJobs.some((j) =>
            typeof j === 'object'
              ? j._id === id || j.sourceUrl === jobData?.sourceUrl || j.providerJobId === jobData?.providerJobId
              : j === id
          );
          setIsSaved(saved);
        } catch {
          // ignore
        }

        // Check if tracked in application pipeline
        try {
          const appRes = await api.get('/applications');
          const apps = appRes.data?.data?.applications || [];
          const found = apps.find((a) => {
            if (a.job?._id === id || a.job === id) return true;
            if (jobData?.providerJobId && a.providerJobId === jobData.providerJobId) return true;
            if (jobData?.sourceUrl && (a.applyUrl === jobData.sourceUrl || a.applyUrl === jobData.applyUrl)) return true;
            if (
              jobData?.title &&
              jobData?.company &&
              String(a.jobTitle || a.job?.title || '').toLowerCase() === String(jobData.title).toLowerCase() &&
              String(a.company || a.job?.company || '').toLowerCase() === String(jobData.company).toLowerCase()
            ) {
              return true;
            }
            return false;
          });
          setTrackedApp(found || null);
        } catch {
          // ignore
        }
      } catch (error) {
        console.error('Failed to load role details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleToggleSave = async () => {
    if (!job || saving) return;
    setSaving(true);
    const idToUse = job._id || job.providerJobId || job.sourceUrl;
    try {
      if (isSaved) {
        await api.delete(`/saved-jobs/${encodeURIComponent(idToUse)}`);
        setIsSaved(false);
      } else {
        await api.post(`/saved-jobs/${encodeURIComponent(idToUse)}`, { job });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling saved job:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTrackOrUpdate = async (status) => {
    if (!job || tracking) return;
    setTracking(true);
    setTrackMessage('');

    try {
      if (trackedApp) {
        // Update status of existing application
        const res = await api.patch(`/applications/${trackedApp._id}`, { status });
        const updated = res.data?.data?.application;
        setTrackedApp((prev) => ({ ...prev, ...updated, status }));
        setTrackMessage(`Application status updated to ${status}!`);
      } else {
        // Create new application
        const payload = {
          jobId: job._id,
          jobTitle: job.title,
          company: job.company,
          companyLogo: job.companyLogo || '',
          location: job.location || '',
          salary: job.salary || '',
          applyUrl: job.applyUrl || job.sourceUrl || '',
          providerJobId: job.providerJobId || '',
          source: job.source || '',
          status,
        };
        const res = await api.post('/applications', payload);
        const created = res.data?.data?.application;
        setTrackedApp(created);
        setTrackMessage(status === 'APPLIED' ? 'Recorded as Applied!' : 'Added to pipeline as Interested!');
      }
      setTimeout(() => setTrackMessage(''), 4000);
    } catch (error) {
      setTrackMessage(error.response?.data?.message || 'Unable to update tracker.');
    } finally {
      setTracking(false);
      setExternalAppliedPrompt(false);
    }
  };

  const handleExternalApplyClick = () => {
    if (!trackedApp || trackedApp.status === 'INTERESTED' || trackedApp.status === 'SAVED') {
      setExternalAppliedPrompt(true);
    }
  };

  if (loading) {
    return <LoadingState label="Loading role details…" />;
  }

  if (!job) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center text-slate-300">
        <h3 className="text-lg font-semibold text-white">Role Not Found</h3>
        <p className="mt-1 text-xs text-slate-400">
          This listing may have expired or is unavailable.
        </p>
        <div className="mt-4">
          <Link to="/jobs">
            <Button variant="primary" size="sm" icon={Compass}>
              Back to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = trackedApp ? (trackedApp.status === 'SAVED' ? 'INTERESTED' : trackedApp.status) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 hover:text-white transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to opportunities
        </Link>
        <span>/</span>
        <span className="text-slate-800 dark:text-slate-200 truncate max-w-sm">{job.title}</span>
      </div>

      {/* Main Role Header Card */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-6 sm:p-8 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {job.company}
              </span>
              {job.source ? (
                <Badge variant="default" size="sm">
                  via {job.source}
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
              {job.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              {job.location ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 px-3 py-1 font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-sky-500 dark:text-accent-400" /> {job.location}
                </span>
              ) : null}
              {job.jobType ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 px-3 py-1 font-semibold">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" /> {job.jobType}
                </span>
              ) : null}
              {job.workMode ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-semibold ${
                    job.workMode === 'Remote'
                      ? 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : job.workMode === 'Hybrid'
                      ? 'border-purple-500/20 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      : job.workMode === 'On-site'
                      ? 'border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {job.workMode === 'Remote' ? (
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                  ) : job.workMode === 'Hybrid' ? (
                    <Building2 className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                  ) : job.workMode === 'On-site' ? (
                    <MapPin className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                  ) : null}
                  {job.workMode}
                </span>
              ) : null}
              {currentStatus ? (
                <Badge
                  variant={
                    currentStatus === 'APPLIED'
                      ? 'accent'
                      : currentStatus === 'INTERVIEW'
                      ? 'purple'
                      : currentStatus === 'OFFER' || currentStatus === 'ACCEPTED'
                      ? 'emerald'
                      : 'default'
                  }
                  size="md"
                >
                  <Check className="h-3.5 w-3.5" /> Pipeline: {currentStatus}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Save / Bookmark Button */}
            <Button
              variant={isSaved ? 'accent' : 'secondary'}
              size="md"
              icon={Bookmark}
              loading={saving}
              onClick={handleToggleSave}
            >
              {isSaved ? 'Saved to Shortlist' : 'Save Role'}
            </Button>

            {/* External Application Button */}
            {job.applyUrl || job.sourceUrl ? (
              <a
                href={job.applyUrl || job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleExternalApplyClick}
              >
                <Button variant="primary" size="md" icon={ExternalLink} iconPosition="right">
                  Apply on site
                </Button>
              </a>
            ) : null}

            {/* Tracker Stage Selector */}
            {trackedApp ? (
              <div className="flex items-center gap-2">
                <select
                  value={currentStatus}
                  onChange={(e) => handleTrackOrUpdate(e.target.value)}
                  disabled={tracking}
                  className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500 shadow-xs"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st.key} value={st.key}>
                      Stage: {st.label}
                    </option>
                  ))}
                </select>
                <Link to="/applications">
                  <Button variant="ghost" size="sm">
                    Tracker →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={tracking}
                  onClick={() => handleTrackOrUpdate('INTERESTED')}
                >
                  Mark Interested
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={tracking}
                  onClick={() => handleTrackOrUpdate('APPLIED')}
                >
                  Record Applied
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        {trackMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {trackMessage}
          </div>
        ) : null}

        {/* Prompt on return from external apply */}
        {externalAppliedPrompt ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-500/30 bg-brand-50 dark:bg-brand-950/40 p-4 text-xs text-brand-900 dark:text-brand-200 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Did you submit your application?</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                CareerPilot does not submit applications automatically. Record your submission to keep your pipeline accurate.
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="primary"
                size="xs"
                onClick={() => handleTrackOrUpdate('APPLIED')}
              >
                Yes, mark as Applied
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setExternalAppliedPrompt(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Two Column Layout: Description & Overview vs. AI Match & Info */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column: Role Details */}
        <div className="space-y-6">
          {/* Overview Grid Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-navy-700/60 pb-3">
              <CardTitle>Role Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    Compensation
                  </div>
                  <div className="mt-1.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {job.salary || 'Competitive / Unspecified'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    Deadline
                  </div>
                  <div className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                    {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Rolling Application'}
                  </div>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  Extracted Skills & Requirements
                </div>
                <div className="flex flex-wrap gap-2">
                  {(job.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-navy-700/60 pb-3">
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                {job.description}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Match & Metadata */}
        <div className="space-y-6">
          <MatchPanel match={match} />

          {/* Provider / Attribution Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-navy-700/60 pb-3">
              <CardTitle>Metadata & Source</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700/80 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Board Source</span>
                  <span className="font-semibold text-white">
                    {job.metadata?.attribution || job.source || 'Aggregated'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Experience Tier</span>
                  <span className="font-semibold text-white">
                    {job.experienceLevel || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Work Arrangement</span>
                  <span className="font-semibold text-white">
                    {job.workMode || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Direct Listing</span>
                  <a
                    href={job.applyUrl || job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-400 hover:text-brand-300 hover:underline inline-flex items-center gap-1"
                  >
                    Open Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {job.metadata?.legalNotice ? (
                  <div className="pt-2 text-[10px] text-slate-500 italic border-t border-slate-800/60">
                    {job.metadata.legalNotice}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
