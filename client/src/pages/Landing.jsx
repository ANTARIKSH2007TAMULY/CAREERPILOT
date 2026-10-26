import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Compass,
  FolderKanban,
  GraduationCap,
  Layers,
  LineChart,
  MessageSquareText,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import BrandLogo from '../components/ui/BrandLogo';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';

const features = [
  {
    icon: BriefcaseBusiness,
    title: 'Aggregated Job Discovery',
    description:
      'Search across verified global job boards like Adzuna, The Muse, and Remotive with instant multi-criteria filtering.',
    badge: 'Discovery',
    tone: 'brand',
  },
  {
    icon: Sparkles,
    title: 'Dual-Key AI Match Analysis',
    description:
      'Evaluate your candidate profile against job descriptions to extract verified strengths, skill gaps, and next-step actions.',
    badge: 'Gemini 3.5',
    tone: 'accent',
  },
  {
    icon: FolderKanban,
    title: 'Full Lifecycle Kanban Tracker',
    description:
      'Track applications from Saved to Offer with interview dates, notes, salary details, and automatic status histories.',
    badge: 'Pipeline',
    tone: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Conversion Pacing & Analytics',
    description:
      'Understand your response and offer rates with honest, zero-safe denominator analytics and trend breakdowns.',
    badge: 'Insights',
    tone: 'amber',
  },
  {
    icon: MessageSquareText,
    title: 'Automated AI Career Coach',
    description:
      'Practice interview scenarios, analyze compensation negotiation strategies, and polish cover letters.',
    badge: 'Coach',
    tone: 'purple',
  },
  {
    icon: ShieldCheck,
    title: 'Zero Scraping & High Privacy',
    description:
      'Strict provider compliance, secure encrypted token storage, isolated per-user quotas, and no silent drops.',
    badge: 'Security',
    tone: 'brand',
  },
];

const steps = [
  {
    step: '01',
    title: 'Build Profile & Materials',
    description: 'Set target roles, verified skills, and paste your resume for honest automated gap analysis.',
  },
  {
    step: '02',
    title: 'Discover & Filter Roles',
    description: 'Filter by job type, remote/hybrid mode, and experience with zero artificial fabrication.',
  },
  {
    step: '03',
    title: 'Analyze Fit with AI',
    description: 'Get deep match analysis powered by dual-key Google Gemini with automatic failover.',
  },
  {
    step: '04',
    title: 'Track Pipeline to Offer',
    description: 'Drag applications through stages, schedule interviews to Google Calendar, and monitor conversion.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F5F7FC] dark:bg-navy-950 text-slate-900 dark:text-slate-100 selection:bg-brand-500/30 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-navy-700/80 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <BrandLogo variant="badge" size="sm" linkTo="/" />

          <nav className="hidden items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="hover:text-brand-600 dark:hover:text-white transition">Features</a>
            <a href="#workflow" className="hover:text-brand-600 dark:hover:text-white transition">Workflow</a>
            <a href="#preview" className="hover:text-brand-600 dark:hover:text-white transition">Preview</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="segmented" />

            <Link
              to="/login"
              className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-brand-500 hover:to-indigo-500 transition"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
          {/* Subtle glow aura */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                The Complete Career Intelligence Platform
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display leading-[1.1]">
                Find opportunities. Apply smarter. <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">Track everything.</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Aggregate jobs from leading global boards, run honest Gemini AI fit evaluations, manage application pipelines with Kanban stages, and analyze conversion velocity.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-glow-brand hover:from-brand-500 hover:to-indigo-500 transition"
                >
                  Start free workspace <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-navy-600 hover:bg-slate-50 dark:hover:bg-navy-800 transition shadow-xs"
                >
                  Explore demo credentials
                </Link>
              </div>

              {/* Trust & Metrics Proof points */}
              <div className="mt-12 pt-8 border-t border-slate-200/90 dark:border-navy-700/80 grid grid-cols-3 gap-6 text-slate-600 dark:text-slate-300">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">100%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real API Data</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">Dual-Key</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gemini Failover</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">8-Stage</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lifecycle Pipeline</div>
                </div>
              </div>
            </div>

            {/* Hero Live Mockup Card */}
            <div id="preview" className="relative rounded-3xl border border-slate-200/90 dark:border-navy-700/80 bg-white/90 dark:bg-navy-850/80 p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700/80 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400">careerpilot.app/dashboard</span>
                </div>
                <Badge variant="emerald" dot pulse size="sm">Pipeline Active</Badge>
              </div>

              <div className="mt-5 space-y-4">
                {/* Metric Strip */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/70 p-3.5">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Applications</span>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white font-display">18</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+4 interviews this week</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/70 p-3.5">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">AI Quota</span>
                    <div className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-300 font-display">20 / 20</div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Resets midnight UTC</span>
                  </div>
                </div>

                {/* Job Matches Mini-feed */}
                <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-200">Recommended Opportunities</span>
                    <span>Verified 30-day feed</span>
                  </div>

                  {[
                    { title: 'Frontend Engineer', company: 'Northstar Labs', score: 94, tone: 'brand' },
                    { title: 'Full Stack Developer', company: 'OrbitWorks', score: 88, tone: 'accent' },
                    { title: 'AI Systems Architect', company: 'Signal Forge', score: 82, tone: 'emerald' },
                  ].map((job) => (
                    <div
                      key={job.title}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-navy-700/80 bg-white dark:bg-navy-900/60 p-3 hover:border-slate-300 dark:hover:border-navy-600 transition shadow-xs"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{job.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{job.company}</div>
                      </div>
                      <Badge variant={job.tone} size="sm">
                        {job.score}% match
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 border-t border-slate-200/90 dark:border-navy-700/80 bg-slate-50/50 dark:bg-navy-900/40">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto">
              <Badge variant="brand">Platform Architecture</Badge>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display">
                Engineered for serious career momentum
              </h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Everything you need to search, assess, track, and close engineering and product opportunities.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description, badge, tone }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-6 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-navy-600 hover:shadow-md dark:hover:shadow-card-hover shadow-xs"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={tone} size="sm">{badge}</Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">{title}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-20 border-t border-slate-200/90 dark:border-navy-700/80">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto">
              <Badge variant="accent">How It Works</Badge>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display">
                Four steps from search to offer
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ step, title, description }) => (
                <div
                  key={step}
                  className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/60 p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-navy-600 transition shadow-xs"
                >
                  <span className="text-3xl font-extrabold text-brand-500/20 font-display block">
                    {step}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white font-display">{title}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 border-t border-slate-200/90 dark:border-navy-700/80 bg-gradient-to-b from-white via-slate-50 to-white dark:from-navy-950 dark:via-navy-900 dark:to-navy-950">
          <div className="mx-auto max-w-3xl text-center px-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display">
              Ready to take command of your job search?
            </h2>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              No credit card required. Connect your profile and launch your workspace in under 60 seconds.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-glow-brand hover:from-brand-500 hover:to-indigo-500 transition"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 dark:border-navy-700/80 py-8 bg-white dark:bg-navy-950 transition-colors">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-slate-500 dark:text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-300">CareerPilot</span>
            <span>—</span>
            <span>AI Career Workspace & Pipeline OS</span>
          </div>
          <div className="flex items-center gap-6">
            <span>© 2026 CareerPilot. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
