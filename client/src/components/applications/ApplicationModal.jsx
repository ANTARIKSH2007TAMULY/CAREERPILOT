import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  DollarSign,
  FileText,
  MapPin,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';

const STATUS_OPTIONS = [
  { key: 'INTERESTED', label: 'Interested / Prospect' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'ASSESSMENT', label: 'Take-home / Assessment' },
  { key: 'INTERVIEW', label: 'Interview Scheduled' },
  { key: 'OFFER', label: 'Offer Received' },
  { key: 'ACCEPTED', label: 'Offer Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function ApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  onScheduleInterview,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    status: 'INTERESTED',
    appliedAt: '',
    deadline: '',
    interviewDate: '',
    location: '',
    salary: '',
    offerSalary: '',
    nextAction: '',
    notes: '',
    recruiter: '',
  });

  const [error, setError] = useState('');
  const isEditing = Boolean(initialData && initialData._id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        jobTitle: initialData.jobTitle || initialData.job?.title || '',
        company: initialData.company || initialData.job?.company || '',
        status: initialData.status === 'SAVED' ? 'INTERESTED' : initialData.status || 'INTERESTED',
        appliedAt: initialData.appliedAt ? initialData.appliedAt.slice(0, 10) : '',
        deadline: initialData.deadline ? initialData.deadline.slice(0, 10) : '',
        interviewDate: initialData.interviewDate ? initialData.interviewDate.slice(0, 10) : '',
        location: initialData.location || initialData.job?.location || '',
        salary: initialData.salary || initialData.job?.salary || '',
        offerSalary: initialData.offerSalary || '',
        nextAction: initialData.nextAction || '',
        notes: initialData.notes || '',
        recruiter: initialData.recruiter || '',
      });
    } else {
      setFormData({
        jobTitle: '',
        company: '',
        status: 'INTERESTED',
        appliedAt: '',
        deadline: '',
        interviewDate: '',
        location: '',
        salary: '',
        offerSalary: '',
        nextAction: '',
        notes: '',
        recruiter: '',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.jobTitle.trim() || !formData.company.trim()) {
      setError('Job title and Company name are required.');
      return;
    }
    setError('');
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-navy-950/80 p-4 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-6 sm:p-7 shadow-2xl my-8 animate-scale-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-white transition"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Edit Tracked Application' : 'Track New Application'}
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isEditing
            ? 'Update hiring stage, interview timelines, recruiter notes, or offer package.'
            : 'Record a prospective or submitted job application to track its end-to-end journey.'}
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Role Title *</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Senior Software Engineer"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Company *</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Stripe, Linear"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Current Stage</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 shadow-xs"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Date Applied</label>
              <input
                type="date"
                name="appliedAt"
                value={formData.appliedAt}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Application Deadline</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Location / Work Mode</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. San Francisco, CA or Remote"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Target Compensation / Range</label>
              <input
                type="text"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="e.g. $140,000 - $170,000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Interview & Offer milestones */}
          <div className="rounded-xl border border-slate-200 dark:border-navy-700/80 bg-slate-50 dark:bg-navy-950/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Milestone Timelines & Details
              </div>
              {isEditing && onScheduleInterview ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onScheduleInterview(initialData);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Schedule Interview</span>
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Interview Scheduled Date</label>
                <input
                  type="date"
                  name="interviewDate"
                  value={formData.interviewDate}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Offer Package</label>
                <input
                  type="text"
                  name="offerSalary"
                  value={formData.offerSalary}
                  onChange={handleChange}
                  placeholder="e.g. $155k base + $25k equity"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Next Action Item</label>
              <input
                type="text"
                name="nextAction"
                value={formData.nextAction}
                onChange={handleChange}
                placeholder="e.g. Prep system design notes"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Recruiter / Contact Name</label>
              <input
                type="text"
                name="recruiter"
                value={formData.recruiter}
                onChange={handleChange}
                placeholder="e.g. Sarah Jenkins (Tech Recruiter)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Notes & Interview Debriefs</label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add key talking points, company values, recruiter debrief notes, or interview takeaways..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 p-3 text-xs leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 dark:border-navy-700/80 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={isSubmitting}
            >
              {isEditing ? 'Update Application' : 'Add to Pipeline'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
