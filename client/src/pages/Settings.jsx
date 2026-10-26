import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Monitor,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { maskEmail } from '../utils/maskEmail';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Calendar integration state
  const [calendar, setCalendar] = useState({
    configured: false,
    connected: false,
    connectedEmail: '',
    connectedAt: null,
    scope: '',
    redirectUri: '',
  });
  const [busy, setBusy] = useState(false);

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    jobAlerts: true,
    applicationReminders: true,
    interviewReminders: true,
  });
  const [prefSaving, setPrefSaving] = useState(false);

  // Profile and account state
  const [account, setAccount] = useState({
    name: '',
    email: '',
    createdAt: null,
  });
  const [accountSaving, setAccountSaving] = useState(false);

  // Password update state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Export data state
  const [exporting, setExporting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const google = searchParams.get('google');
    const reason = searchParams.get('reason');
    if (google === 'connected') showToast('Google Calendar connected successfully.');
    if (google === 'denied') showToast('Google Calendar access was denied or cancelled.', 'error');
    if (google === 'invalid-state') showToast('Google Calendar connection failed state validation.', 'error');
    if (google === 'db-required') showToast('MongoDB is required to store Google Calendar tokens.', 'error');
    if (google === 'unauthorized') showToast('User session authorization error.', 'error');
    if (google === 'error') showToast(reason ? `Connection error: ${decodeURIComponent(reason)}` : 'Google Calendar connection failed.', 'error');

    const loadData = async () => {
      try {
        const [calRes, userRes] = await Promise.all([
          api.get('/integrations/google/status').catch(() => ({ data: { data: { configured: false, connected: false } } })),
          api.get('/user/profile').catch(() => null),
        ]);

        setCalendar(calRes.data?.data || { configured: false, connected: false });

        const user = userRes?.data?.data?.user;
        if (user) {
          setAccount({
            name: user.name || '',
            email: user.email || '',
            createdAt: user.createdAt || null,
          });

          const prefs = user.notificationPreferences;
          if (prefs) {
            setPreferences({
              jobAlerts: prefs.jobAlerts !== false,
              applicationReminders: prefs.applicationReminders !== false,
              interviewReminders: prefs.interviewReminders !== false,
            });
          }
        }
      } catch (error) {
        setCalendar({ configured: false, connected: false });
      }
    };

    loadData();
  }, [searchParams]);

  // Handle Account info update
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!account.name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    setAccountSaving(true);
    try {
      await api.put('/user/profile', { name: account.name.trim() });
      showToast('Account profile updated successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setAccountSaving(false);
    }
  };

  // Handle Password update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      showToast('Please enter your current password.', 'error');
      return;
    }
    if (passwords.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Notification preferences toggle
  const handleTogglePref = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    setPrefSaving(true);
    try {
      await api.put('/user/profile', { notificationPreferences: preferences });
      showToast('Notification preferences saved.');
    } catch (err) {
      showToast('Failed to save notification preferences.', 'error');
    } finally {
      setPrefSaving(false);
    }
  };

  // Google Calendar actions
  const connectCalendar = async () => {
    setBusy(true);
    try {
      const response = await api.get('/integrations/google/connect');
      const url = response.data?.data?.authorizationUrl;
      if (url) window.location.assign(url);
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to start Google Calendar connection.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const disconnectCalendar = async () => {
    setBusy(true);
    try {
      await api.post('/integrations/google/disconnect');
      setCalendar((current) => ({ ...current, connected: false, connectedAt: null, connectedEmail: '' }));
      showToast('Google Calendar disconnected.');
    } catch (error) {
      showToast('Unable to disconnect Google Calendar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const testCalendar = async () => {
    setBusy(true);
    try {
      const response = await api.get('/integrations/google/test');
      showToast(`Test passed: ${response.data?.data?.calendarCount ?? 0} calendars accessible.`);
    } catch (error) {
      showToast(error.response?.data?.data?.error || error.response?.data?.message || 'Calendar test failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Export full user dataset
  const handleExportData = async () => {
    setExporting(true);
    try {
      const [userRes, appsRes, savedRes] = await Promise.all([
        api.get('/user/profile').catch(() => ({ data: { data: {} } })),
        api.get('/applications').catch(() => ({ data: { data: { applications: [] } } })),
        api.get('/saved-jobs').catch(() => ({ data: { data: { jobs: [] } } })),
      ]);

      const bundle = {
        exportedAt: new Date().toISOString(),
        user: userRes.data?.data?.user || {},
        applications: appsRes.data?.data?.applications || [],
        savedJobs: savedRes.data?.data?.jobs || [],
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `careerpilot-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Your career data archive has been downloaded.');
    } catch (err) {
      showToast('Failed to export career data.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const googleParam = searchParams.get('google');
  const isGoogleError = ['denied', 'invalid-state', 'db-required', 'unauthorized', 'error'].includes(googleParam);

  const connectionState = calendar.connected
    ? 'Connected'
    : isGoogleError
    ? 'Connection failed'
    : calendar.configured
    ? 'Not connected'
    : 'External setup required';

  const badgeVariant = calendar.connected
    ? 'emerald'
    : isGoogleError
    ? 'rose'
    : calendar.configured
    ? 'accent'
    : 'default';

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        category="System & Preferences"
        categoryIcon={Sliders}
        title="Settings & Integrations"
        description="Configure appearance themes, account credentials, notification schedules, and calendar synchronization."
      />

      {/* 1. Appearance & Theme Selection */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-5 sm:p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            Appearance & theme
          </div>
          <Badge variant="brand" size="sm">
            Active: {theme === 'system' ? `System (${resolvedTheme})` : theme.charAt(0).toUpperCase() + theme.slice(1)}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Choose your interface theme. System mode dynamically adapts to your operating system's color scheme.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              id: 'light',
              title: 'Light mode',
              description: 'Crisp, high-contrast light theme for daytime focus.',
              icon: Sun,
              active: theme === 'light',
            },
            {
              id: 'dark',
              title: 'Dark mode',
              description: 'Sleek, eye-friendly dark palette for low-light environments.',
              icon: Moon,
              active: theme === 'dark',
            },
            {
              id: 'system',
              title: 'System default',
              description: 'Syncs automatically with your OS preference.',
              icon: Monitor,
              active: theme === 'system',
            },
          ].map(({ id, title, description, icon: Icon, active }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
                active
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 ring-1 ring-brand-500/30'
                  : 'border-slate-200 dark:border-navy-700 bg-slate-50/70 dark:bg-navy-950/50 hover:border-slate-300 dark:hover:border-navy-600'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'bg-white dark:bg-navy-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-navy-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {active ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white text-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Account & Profile Credentials */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-5 sm:p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <User className="h-4 w-4 text-brand-500 dark:text-brand-400" />
          Account & identity
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Manage your personal account details and access credentials.
        </p>

        <form onSubmit={handleUpdateAccount} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={account.name}
                onChange={(e) => setAccount((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Account Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={account.email}
                  disabled
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-100 dark:bg-navy-900 px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <span className="absolute right-3 top-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={accountSaving}
            >
              Update Account Name
            </Button>
          </div>
        </form>

        {/* Change Password Sub-section */}
        <div className="mt-6 border-t border-slate-100 dark:border-navy-700/80 pt-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200">
            <KeyRound className="h-4 w-4 text-slate-500" />
            Change security password
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Ensure your password is at least 6 characters long to protect your career data.
          </p>

          <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3 max-w-xl">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-start">
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                loading={passwordSaving}
                disabled={!passwords.currentPassword || !passwords.newPassword}
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. Notification Preferences */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-5 sm:p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Bell className="h-4 w-4 text-brand-500 dark:text-brand-400" />
          Notification preferences
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Control which automated email alerts CareerPilot sends via Resend. Unsubscribe anytime.
        </p>

        <div className="mt-5 space-y-3">
          {[
            {
              key: 'jobAlerts',
              title: 'Job alert digests',
              description: 'Receive periodic emails with newly matched roles and internships.',
              checked: preferences.jobAlerts,
            },
            {
              key: 'interviewReminders',
              title: 'Interview reminders',
              description: 'Get automated email reminders (3d, 1d, 6h, 1h) before scheduled interviews.',
              checked: preferences.interviewReminders,
            },
            {
              key: 'applicationReminders',
              title: 'Application deadline reminders',
              description: 'Get notified when an upcoming job application deadline is approaching.',
              checked: preferences.applicationReminders,
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50/70 dark:bg-navy-950/60 p-4 transition hover:border-slate-300 dark:hover:border-navy-600 hover:bg-slate-100/70 dark:hover:bg-navy-950"
            >
              <div className="pr-4">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</div>
              </div>

              {/* Styled Switch */}
              <div
                onClick={(e) => {
                  e.preventDefault();
                  handleTogglePref(item.key);
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  item.checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-navy-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    item.checked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            variant="accent"
            size="sm"
            onClick={savePreferences}
            loading={prefSaving}
          >
            Save Notification Preferences
          </Button>
        </div>
      </div>

      {/* 4. Google Calendar Integration */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-5 sm:p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <CalendarDays className="h-4 w-4 text-accent-500 dark:text-accent-400" />
            Google Calendar integration
          </div>
          <Badge
            variant={badgeVariant}
            dot
          >
            {connectionState}
          </Badge>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Connect your Google Calendar for read-only visibility of interview slots. You can connect any personal or work Google account (it does not need to match your CareerPilot email). Tokens are encrypted with AES-256-GCM on the backend and are never exposed to the client.
        </p>

        {calendar.connected ? (
          <div className="mt-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Google Calendar is actively connected</span>
            </div>
            {calendar.connectedEmail && (
              <div className="text-slate-700 dark:text-slate-300">
                Connected Google Account:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {maskEmail(calendar.connectedEmail)}
                </span>
              </div>
            )}
            {calendar.connectedAt && (
              <div className="text-slate-500 dark:text-slate-400">
                Connected on: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(calendar.connectedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : null}

        {isGoogleError && !calendar.connected ? (
          <div className="mt-3.5 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">OAuth Authorization Failed</div>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300/90">
                {googleParam === 'denied'
                  ? 'Access was denied or cancelled in the Google account selection prompt.'
                  : searchParams.get('reason')
                  ? decodeURIComponent(searchParams.get('reason'))
                  : 'An error occurred while exchanging tokens with Google.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={connectCalendar}
              disabled={busy || !calendar.configured}
              className="border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 shrink-0"
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!calendar.configured ? (
          <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Google OAuth credentials are not set on the server. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable calendar sync.
          </div>
        ) : null}

        {calendar.configured && (
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Authorized Callback URI:{' '}
            <code className="rounded bg-slate-100 dark:bg-navy-900 px-1 py-0.5 text-slate-700 dark:text-slate-300 font-mono">
              {calendar.redirectUri || 'http://localhost:5001/api/integrations/google/callback'}
            </code>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button
            variant="accent"
            size="sm"
            onClick={connectCalendar}
            disabled={busy || !calendar.configured}
            loading={busy}
          >
            {calendar.connected ? 'Reconnect Different Account' : 'Connect Calendar'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={testCalendar}
            disabled={busy || !calendar.connected}
          >
            Test Connection
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnectCalendar}
            disabled={busy || !calendar.connected}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* 5. Data Management & Export */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-5 sm:p-6 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Download className="h-4 w-4 text-brand-500 dark:text-brand-400" />
          Data management & export
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Download a complete portable archive of your tracked applications, saved roles, and profile data in JSON format.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50/70 dark:bg-navy-950/60 p-4">
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Export All Career Data</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Includes profile skills, targets, full application board stages, notes, and bookmarked roles.
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportData}
            loading={exporting}
          >
            Download JSON Archive
          </Button>
        </div>
      </div>

      {/* Security Architecture Guarantee */}
      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/70 dark:bg-navy-900/50 p-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed shadow-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm mb-1">Architecture & Data Privacy Standards</div>
        CareerPilot operates with strict security isolation: dual-key Gemini rotation, JWT authentication cookies with HTTP-only and SameSite flags, AES-256-GCM encrypted token persistence, and zero client-side credential exposure.
      </div>
    </div>
  );
}
