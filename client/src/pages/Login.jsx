import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/ui/BrandLogo';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleQuickFill = (email, password) => {
    setForm({ email, password });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#F5F7FC] dark:bg-navy-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header Bar with Back Link and Theme Switcher */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="segmented" />
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-900 shadow-2xl">
          {/* Left Branding Panel (Desktop) */}
          <div className="relative hidden lg:flex lg:col-span-6 flex-col justify-between p-10 lg:p-12 bg-gradient-to-br from-[#0B1228] via-[#111A30] to-[#1E1B4B] text-white overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-brand-500/20 blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-accent-500/20 blur-[90px] pointer-events-none" />

            {/* Brand Logo at Top */}
            <div className="relative z-10">
              <BrandLogo variant="full" size="md" theme="dark" linkTo="/" />
            </div>

            {/* Center Content */}
            <div className="relative z-10 my-auto py-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300 uppercase tracking-wider mb-4">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                <span>Intelligent Career Copilot</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-tight text-white">
                Your Career Journey, Powered by AI
              </h2>

              <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-md">
                Discover verified jobs from Adzuna, The Muse, and Remotive, track interview pipelines, and accelerate your career with AI-guided preparation.
              </p>

              {/* Feature Highlights with Clean Checkmarks */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Verified 30-day jobs aggregated across top job boards</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Dual-key automated AI career coaching and resume reviews</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Kanban pipeline tracking with interview reminders</span>
                </div>
              </div>
            </div>

            {/* Large Decorative Paper-Plane Watermark in Bottom */}
            <div className="relative z-10 pt-4 flex items-center justify-between border-t border-slate-800/80 text-xs text-slate-400">
              <span>CareerPilot Platform PRO</span>
              <span className="text-slate-500">Fast · Secure · Intelligent</span>
            </div>

            {/* Subtle Watermark Vector */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 opacity-10 pointer-events-none">
              <svg viewBox="0 0 64 64" fill="none" className="w-full h-full text-white">
                <path d="M 56 10 L 9 34 L 27 41 L 56 10 Z" fill="currentColor" />
                <path d="M 56 10 L 27 41 L 43 54 L 56 10 Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-navy-850">
            {/* Mobile Logo display */}
            <div className="lg:hidden mb-6 flex justify-center">
              <BrandLogo variant="full" size="md" linkTo="/" />
            </div>

            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
                  Welcome Back
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Sign in to your CareerPilot account to continue your journey.
                </p>
              </div>

              {/* Demo Credentials Quick-Fill Card */}
              <div className="mb-6 rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  <span>Instant Demo Credentials</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('alex@example.com', 'CareerPilotDemo123!')}
                    className="flex flex-col items-start rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 p-2 text-left hover:border-brand-500/50 hover:shadow-xs transition"
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Alex Chen</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Software Engineer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('maria@example.com', 'CareerPilotDemo123!')}
                    className="flex flex-col items-start rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 p-2 text-left hover:border-brand-500/50 hover:shadow-xs transition"
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Maria Santos</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Product Manager</span>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-navy-700 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Remember me</span>
                  </label>

                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    Standard 7-day session
                  </span>
                </div>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full mt-2 font-semibold shadow-md shadow-brand-500/20"
                >
                  Sign In
                </Button>
              </form>

              {/* Footer Switcher */}
              <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition underline underline-offset-4"
                >
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding Bar */}
      <div className="py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
        CareerPilot · Modern AI Career Copilot & Application Tracker · System & Dark/Light Theme
      </div>
    </div>
  );
}
