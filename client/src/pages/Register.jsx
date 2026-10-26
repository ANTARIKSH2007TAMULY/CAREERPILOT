import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/ui/BrandLogo';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-navy-700' };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [form.password]);

  // Passwords match validation
  const passwordsMatch = useMemo(() => {
    if (!form.confirmPassword) return null;
    return form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#F5F7FC] dark:bg-navy-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header Bar */}
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
            <div className="relative z-10 my-auto py-6">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-tight text-white">
                Build Your Future Today
              </h2>

              <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-md">
                Join CareerPilot and get access to thousands of verified jobs, personalized AI recommendations, and complete application pipeline management.
              </p>

              {/* Feature Highlights with Circular Icon Badges from Reference Image */}
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/10 text-brand-300 shadow-sm">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Thousands of Remote & Local Jobs</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Find opportunities from top companies across three live feeds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/10 text-accent-300 shadow-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">AI Career Coach</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Get personalized guidance, interview tips, and salary negotiation insight.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-sm">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Track Your Progress</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Monitor application velocity, interview status, and conversion rates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Build & Improve Your Resume</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Analyze job descriptions and align your credentials with smart AI matching.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing Paper-Plane Navigation Motif in Bottom */}
            <div className="relative z-10 pt-4 flex items-center justify-between border-t border-slate-800/80 text-xs text-slate-400">
              <span>CareerPilot Enterprise Grade</span>
              <span className="text-slate-500">100% Free · No Credit Card Required</span>
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
                  Create Your Account
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Start your journey towards your dream career today.
                </p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    {form.password && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Create a strong password (6+ chars)"
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

                  {/* Password Strength Progress Bar */}
                  {form.password && (
                    <div className="mt-2 flex gap-1 h-1 w-full bg-slate-100 dark:bg-navy-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                        } flex-1`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'
                        } flex-1`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'
                        } flex-1`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm password
                    </label>
                    {passwordsMatch !== null && (
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check className="h-3 w-3" /> Passwords match
                          </>
                        ) : (
                          'Does not match'
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className={`w-full rounded-xl border bg-white dark:bg-navy-900/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:ring-2 ${
                        passwordsMatch === false
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-navy-700 focus:border-brand-500 focus:ring-brand-500/20'
                      }`}
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                  Create Account
                </Button>
              </form>

              {/* Footer Switcher */}
              <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition underline underline-offset-4"
                >
                  Sign in
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
