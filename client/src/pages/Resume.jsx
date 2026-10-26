import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileCheck,
  FileText,
  Lock,
  Shield,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import { aiService } from '../services/aiService';
import api from '../services/api';

export default function Resume() {
  const [filename, setFilename] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/user/profile');
        const user = response.data?.data?.user;
        if (user?.resume) {
          setResumeText(user.resume);
        }
      } catch (err) {
        console.warn('Could not load profile resume:', err.message);
      }
    };
    fetchProfile();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setError('');

    // If text-like file, read contents directly into the resume text
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setResumeText(text);
          showToast(`Loaded ${file.name} content into editor.`);
        }
      };
      reader.readAsText(file);
    } else {
      // For binary files like PDF/DOCX, store file summary description if empty
      if (!resumeText) {
        setResumeText(`[Uploaded Document: ${file.name} (${Math.round(file.size / 1024)} KB)]`);
      }
      showToast(`Attached ${file.name}`);
    }
  };

  const handleSaveResume = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/user/profile', { resume: resumeText });
      showToast('Resume content saved to profile.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save resume text to profile');
      showToast('Failed to save resume.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      // If user has unsaved changes, save to profile first
      if (resumeText) {
        await api.put('/user/profile', { resume: resumeText }).catch(() => {});
      }
      const response = await aiService.analyzeResume();
      setAnalysis(response.data?.data || null);
      showToast('AI analysis completed.');
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Unable to analyze the current profile.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        category="Credentials & Materials"
        categoryIcon={FileText}
        title="Resume & skill assessment"
        description="Upload or manage your career highlights. CareerPilot analyzes skill alignment and role fitness without fabricating qualifications."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Upload & Content Box */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <UploadCloud className="h-4 w-4 text-brand-500 dark:text-brand-400" />
            Resume document & text
          </div>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-navy-700 bg-slate-50/80 dark:bg-navy-950/70 p-6 text-center transition hover:border-brand-500/50 hover:bg-slate-100/50 dark:hover:bg-navy-950">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-navy-900 text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-navy-700 shadow-xs">
              <UploadCloud className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Click to choose a file (.txt, .md, .pdf, .docx)
            </span>
            <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Text and markdown are automatically parsed into the editor below
            </span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {filename ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-700 dark:text-brand-300">
              <FileCheck className="h-3.5 w-3.5" /> Selected: {filename}
            </div>
          ) : null}

          <div className="mt-4">
            <label htmlFor="resume-content" className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Resume summary & highlights
            </label>
            <textarea
              id="resume-content"
              rows={7}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste or write your experience, education, key projects, and skill highlights here..."
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950/80 p-3 text-xs leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{resumeText.length} characters</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveResume}
              loading={saving}
            >
              Save to profile
            </Button>
          </div>
        </div>

        {/* Readiness and Privacy Specifications */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Shield className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              Evaluation guidelines & readiness
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/60 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Profile synchronization</div>
                <div className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {resumeText.trim()
                    ? 'Resume content is synchronized and ready for skill-gap and match evaluations.'
                    : 'Add resume content or update your skills in Profile to run personalized analysis.'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/60 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data safety & encryption</div>
                <div className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  Only your profile and resume text are sent to the AI evaluation layer. Credentials, tokens, and personal identifiers remain strictly on the server.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/60 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Factual integrity</div>
                <div className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  CareerPilot adheres to strict anti-hallucination standards. We never invent qualifications, employers, or metrics not present in your profile.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-brand-500 dark:text-brand-400" />
              AI resume & skill-gap review
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Evaluates your strengths, gaps, and actionable recommendations against industry standards.
            </p>
          </div>
          <Button
            variant="accent"
            onClick={handleAnalyze}
            loading={loading}
            icon={Sparkles}
          >
            Analyze Profile & Resume
          </Button>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        ) : null}

        {analysis ? (
          <div className="mt-6 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 animate-fade-in">
            <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">Executive summary</div>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">{analysis.summary}</p>
              {analysis.disclaimer ? (
                <p className="mt-2 text-[11px] text-slate-500 italic border-t border-slate-200 dark:border-navy-700/80 pt-1.5">{analysis.disclaimer}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/15 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Identified Strengths</div>
                <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {(analysis.strengths || []).length > 0 ? (
                    analysis.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 dark:text-slate-500">None listed in profile</li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/15 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Skill Gaps to Address</div>
                <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {(analysis.skillGaps || []).length > 0 ? (
                    analysis.skillGaps.map((g, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 flex-shrink-0 mt-1.5" />
                        <span>{g}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 dark:text-slate-500">No major gaps identified</li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-brand-500/20 bg-brand-50 dark:bg-brand-950/15 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Actionable Suggestions</div>
                <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {(analysis.suggestions || []).length > 0 ? (
                    analysis.suggestions.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400 flex-shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 dark:text-slate-500">Maintain current project cadence</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-950/40 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Click "Analyze Profile & Resume" to generate a tailored report based on your profile skills, experience, and uploaded resume text.
          </div>
        )}
      </div>
    </div>
  );
}
