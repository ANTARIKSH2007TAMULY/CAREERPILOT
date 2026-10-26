import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import interviewService from '../../services/interviewService';

const INTERVIEW_TYPES = [
  'Video',
  'Phone',
  'Technical',
  'HR',
  'On-site',
  'Other',
];

const REMINDER_INTERVALS = [
  { key: '3d', label: '3 days before', description: 'Early prep & itinerary review' },
  { key: '1d', label: '1 day before', description: 'Final preparation & mock practice' },
  { key: '6h', label: '6 hours before', description: 'Day-of logistics & environment check' },
  { key: '1h', label: '1 hour before', description: 'Immediate countdown & join link' },
];

const STATUS_BADGE = {
  SCHEDULED: 'border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300',
  SENT: 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  FAILED: 'border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  CANCELLED: 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  SKIPPED: 'border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function InterviewModal({
  isOpen,
  onClose,
  application,
  interview = null,
  onSuccess,
}) {
  const defaultTz =
    interview?.timezone ||
    (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch {
        return 'UTC';
      }
    })();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [timezone, setTimezone] = useState(defaultTz);
  const [type, setType] = useState('Video');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [interviewerTitle, setInterviewerTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [preferences, setPreferences] = useState({
    '3d': true,
    '1d': true,
    '6h': true,
    '1h': true,
  });

  const [error, setError] = useState('');
  const [isPast, setIsPast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState('');

  const isEditing = Boolean(interview && interview._id);

  // Initialize form state
  useEffect(() => {
    if (interview) {
      if (interview.startTime) {
        const d = new Date(interview.startTime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);

        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${min}`);
      }
      setTimezone(interview.timezone || defaultTz);
      setType(interview.type || 'Video');
      setMeetingUrl(interview.meetingUrl || '');
      setLocation(interview.location || '');
      setInterviewerName(interview.interviewer?.name || '');
      setInterviewerEmail(interview.interviewer?.email || '');
      setInterviewerTitle(interview.interviewer?.title || '');
      setNotes(interview.notes || '');
      setPreferences({
        '3d': interview.reminderPreferences?.['3d'] !== false,
        '1d': interview.reminderPreferences?.['1d'] !== false,
        '6h': interview.reminderPreferences?.['6h'] !== false,
        '1h': interview.reminderPreferences?.['1h'] !== false,
      });
    } else {
      // New interview defaults to tomorrow at 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime('10:00');
      setTimezone(defaultTz);
      setType('Video');
      setMeetingUrl('');
      setLocation('');
      setInterviewerName('');
      setInterviewerEmail('');
      setInterviewerTitle('');
      setNotes('');
      setPreferences({ '3d': true, '1d': true, '6h': true, '1h': true });
    }
    setError('');
    setTestSentMessage('');
  }, [interview, isOpen]);

  // Check if chosen time is in the past
  useEffect(() => {
    if (date && time) {
      const scheduledInstant = new Date(`${date}T${time}:00`);
      setIsPast(scheduledInstant.getTime() < Date.now());
    } else {
      setIsPast(false);
    }
  }, [date, time]);

  if (!isOpen) return null;

  const handleTogglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Please select an interview date.');
      return;
    }
    if (!time) {
      setError('Please select an interview start time.');
      return;
    }

    const scheduledDate = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledDate.getTime())) {
      setError('Invalid interview date or start time.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      startTime: scheduledDate.toISOString(),
      timezone,
      type,
      meetingUrl: meetingUrl.trim(),
      location: location.trim(),
      interviewer: {
        name: interviewerName.trim(),
        email: interviewerEmail.trim(),
        title: interviewerTitle.trim(),
      },
      notes: notes.trim(),
      reminderPreferences: preferences,
    };

    try {
      let saved;
      if (isEditing) {
        const res = await interviewService.updateInterview(interview._id, payload);
        saved = res.data?.data?.interview;
      } else {
        const appId = application?._id;
        if (!appId) {
          throw new Error('Application ID is required to schedule an interview.');
        }
        const res = await interviewService.createInterview(appId, payload);
        saved = res.data?.data?.interview;
      }

      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!interview?._id) return;
    setIsSendingTest(true);
    setTestSentMessage('');
    setError('');
    try {
      const res = await interviewService.sendTestEmail(interview._id);
      setTestSentMessage(res.data?.message || 'Test reminder sent to your registered email!');
    } catch (err) {
      console.error('Failed to send test email:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send test reminder email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDeleteInterview = async () => {
    if (!interview?._id) return;
    if (!window.confirm('Are you sure you want to cancel this interview and remove all upcoming reminders?')) {
      return;
    }
    setIsDeleting(true);
    setError('');
    try {
      await interviewService.deleteInterview(interview._id);
      if (onSuccess) {
        onSuccess({ deleted: true, _id: interview._id });
      }
      onClose();
    } catch (err) {
      console.error('Failed to cancel interview:', err);
      setError(err.response?.data?.message || err.message || 'Failed to cancel interview');
    } finally {
      setIsDeleting(false);
    }
  };

  const roleName = application?.jobTitle || application?.job?.title || 'Role';
  const companyName = application?.company || application?.job?.company || 'Company';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-navy-950/80 p-4 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-6 sm:p-7 shadow-2xl my-8 animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-white transition"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
          <Calendar className="h-5 w-5" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Manage & Reschedule Interview' : 'Schedule Interview'}
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {companyName} • {roleName} — automated email reminders will be sent to your verified email.
        </p>

        {/* Error notification */}
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Success test email notification */}
        {testSentMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{testSentMessage}</span>
          </div>
        ) : null}

        {/* Past warning */}
        {isPast ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Note:</strong> The selected interview date & time is in the past. Overdue reminders will be marked as skipped automatically.
            </span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Date, Time, Timezone */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interview Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Time Zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 shadow-xs"
              >
                {!COMMON_TIMEZONES.includes(timezone) ? (
                  <option value={timezone}>{timezone}</option>
                ) : null}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type & Meeting URL */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interview Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 shadow-xs"
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Meeting Link / URL (optional)
              </label>
              <div className="relative mt-1.5">
                <Video className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xyz or Zoom link"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>
          </div>

          {/* Location & Interviewer details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Location (if On-site or Office)
              </label>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Stripe HQ, Floor 4 or Remote"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interviewer Name & Role (optional)
              </label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="e.g. Alex Morgan (Eng Manager)"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>
          </div>

          {/* Interviewer email */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interviewer Email (optional)
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="email"
                  value={interviewerEmail}
                  onChange={(e) => setInterviewerEmail(e.target.value)}
                  placeholder="interviewer@company.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes / Agenda / Prep Points
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key projects to highlight, system design topics..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Automated Reminders Configuration */}
          <div className="rounded-xl border border-slate-200 dark:border-navy-700/80 bg-slate-50 dark:bg-navy-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Bell className="h-4 w-4 text-brand-500" />
                <span>Automated Email Reminder Intervals</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Managed via BullMQ background queue
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
              {REMINDER_INTERVALS.map((rem) => {
                const isEnabled = preferences[rem.key];
                return (
                  <label
                    key={rem.key}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      isEnabled
                        ? 'border-brand-500/40 bg-brand-50/50 dark:bg-brand-500/10 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200 dark:border-navy-700/70 bg-white dark:bg-navy-900 text-slate-500 dark:text-slate-400 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleTogglePreference(rem.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{rem.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {rem.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Delivery Status Viewer (for existing interview) */}
          {isEditing && Array.isArray(interview.reminders) && interview.reminders.length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-navy-700/80 bg-white dark:bg-navy-900 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Reminder Delivery Status</span>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition"
                >
                  <Send className="h-3 w-3" />
                  {isSendingTest ? 'Sending Test...' : 'Send Test Reminder Email'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-navy-700/60 pt-1">
                {interview.reminders.map((r) => (
                  <div key={r.interval} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {r.interval} before
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Due: {new Date(r.dueTime).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_BADGE[r.status] || STATUS_BADGE.SCHEDULED
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.sentAt ? (
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.sentAt).toLocaleTimeString()}
                        </span>
                      ) : null}
                      {r.error ? (
                        <span className="text-[10px] text-rose-500 truncate max-w-[120px]" title={r.error}>
                          {r.error}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-navy-700/80 pt-4">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || isDeleting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-navy-600 transition shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5 text-brand-500" />
                    {isSendingTest ? 'Sending...' : 'Send Test Reminder'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteInterview}
                    disabled={isDeleting || isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 transition shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? 'Cancelling...' : 'Cancel Interview'}
                  </button>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={isSubmitting}
                disabled={isDeleting}
              >
                {isEditing ? 'Save Changes' : 'Schedule Interview'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
