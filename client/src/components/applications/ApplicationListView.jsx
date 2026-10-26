import {
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  Edit2,
  ExternalLink,
  HelpCircle,
  MapPin,
  MoreVertical,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import React from 'react';
import { ALL_STATUSES } from './KanbanBoard';

const STATUS_BADGES = {
  INTERESTED: 'border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300',
  SAVED: 'border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300',
  APPLIED: 'border-sky-500/20 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300',
  INTERVIEW: 'border-purple-500/20 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
  OFFER: 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  ACCEPTED: 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  WITHDRAWN: 'border-slate-300 dark:border-slate-500/30 bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

export default function ApplicationListView({
  applications,
  onEdit,
  onDelete,
  onStatusChange,
  onScheduleInterview,
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-navy-700 bg-white/40 dark:bg-navy-900/40 p-8 text-center text-xs text-slate-400 dark:text-slate-500">
        No applications match your filter criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 shadow-xs dark:shadow-card backdrop-blur-sm">
      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
        <thead className="border-b border-slate-200/90 dark:border-navy-700/80 bg-slate-50 dark:bg-navy-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <tr>
            <th className="px-5 py-3.5">Role & Company</th>
            <th className="px-5 py-3.5">Stage & Quick Move</th>
            <th className="px-5 py-3.5">Applied Date</th>
            <th className="px-5 py-3.5">Interview / Deadline</th>
            <th className="px-5 py-3.5">Compensation</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
          {applications.map((app) => {
            const title = app.jobTitle || app.job?.title || 'Unknown Role';
            const company = app.company || app.job?.company || 'Company';
            const statusKey = app.status === 'SAVED' ? 'INTERESTED' : app.status;
            const badgeClass = STATUS_BADGES[statusKey] || 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

            return (
              <tr key={app._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-navy-800/40">
                <td className="px-5 py-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{title}</div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{company}</div>
                  {app.location ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <MapPin className="h-2.5 w-2.5" /> {app.location}
                    </div>
                  ) : null}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                      {statusKey}
                    </span>
                    <select
                      value={statusKey}
                      onChange={(e) => onStatusChange(app._id, e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 shadow-xs"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  {app.appliedAt ? (
                    new Date(app.appliedAt).toLocaleDateString()
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-5 py-4">
                  {app.interviewDate ? (
                    <button
                      type="button"
                      onClick={() => onScheduleInterview && onScheduleInterview(app, app.interviews?.[0] || null)}
                      className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
                      title="Click to view, reschedule, or cancel interview"
                    >
                      <Clock3 className="h-3 w-3" />
                      {new Date(app.interviewDate).toLocaleDateString()}
                    </button>
                  ) : app.deadline ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      Due: {new Date(app.deadline).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-300">
                  {app.offerSalary || app.salary || app.job?.salary || (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {onScheduleInterview ? (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(app)}
                        title="Schedule or view interview"
                        className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-2 text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition shadow-xs"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEdit(app)}
                      title="Edit application"
                      className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-2 text-slate-500 hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(app)}
                      title="Delete application"
                      className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-2 text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
