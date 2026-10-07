import { ArrowRight, BarChart3, BriefcaseBusiness, ChevronRight, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: BriefcaseBusiness, title: 'Job discovery', description: 'Find internships and jobs aligned to your skills and goals.' },
  { icon: Sparkles, title: 'AI match analysis', description: 'Get structured match scores, strengths and skill gaps.' },
  { icon: BarChart3, title: 'Application insights', description: 'Track every stage, deadlines, response rate and outcome trends.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 font-semibold text-white">C</div>
            <div>
              <div className="text-base font-semibold text-white">CareerPilot</div>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#analytics" className="hover:text-white">Analytics</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Login</Link>
            <Link to="/register" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">Start free</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered career platform
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-white">
              Find opportunities. Apply smarter. Track everything.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Discover jobs, compare your fit, manage applications, and build momentum with AI-guided insights for your next opportunity.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-500">
                Sign in
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-12 text-sm text-slate-300">
              <div>
                <div className="text-2xl font-semibold text-white">12k+</div>
                <div>opportunities</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">4.9/5</div>
                <div>student experience</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Job radar</div>
                  <div className="mt-2 text-xl font-semibold text-white">Recommended roles</div>
                </div>
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">+18% this week</div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ['Frontend Engineer', 'Northstar Labs', '91% match'],
                  ['AI Product Analyst', 'Signal Forge', '88% match'],
                  ['Full Stack Developer', 'OrbitWorks', '85% match'],
                ].map(([title, company, match]) => (
                  <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">{title}</div>
                        <div className="text-sm text-slate-400">{company}</div>
                      </div>
                      <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300">{match}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Features</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Everything you need to move your career forward</h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="grid gap-6 lg:grid-cols-4">
              {[
                ['01', 'Build profile', 'Add skills, roles, and work preferences.'],
                ['02', 'Discover roles', 'Search and filter jobs that fit your trajectory.'],
                ['03', 'Evaluate fit', 'Get AI match analysis and recommendations.'],
                ['04', 'Track outcomes', 'Manage the full application pipeline and deadlines.'],
              ].map(([step, title, description]) => (
                <div key={step} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-sm text-sky-300">{step}</div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="analytics" className="mx-auto max-w-7xl px-6 pb-20 pt-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
                <TrendingUp className="h-4 w-4 text-sky-300" /> Analytics
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-white">See response trends and pacing</h3>
              <div className="mt-6 h-48 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                <div className="flex h-full items-end justify-between gap-3">
                  {[50, 88, 66, 94, 72, 100].map((height, index) => (
                    <div key={height + index} className="flex-1 rounded-t-xl bg-gradient-to-t from-sky-500 to-indigo-400" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
                <Target className="h-4 w-4 text-sky-300" /> Outcomes
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ['Interview conversion', '38%'],
                  ['Offer conversion', '12%'],
                  ['Response rate', '67%'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-lg font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800 bg-slate-950/60 py-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Ready to go</div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Build momentum with your next opportunity.</h2>
            <div className="mt-8 flex justify-center">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400">
                Create account <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 md:flex-row">
          <div>© 2026 CareerPilot</div>
          <div className="flex items-center gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
