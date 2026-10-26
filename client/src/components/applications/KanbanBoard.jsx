import {
  BookOpenCheck,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Edit2,
  Gift,
  MapPin,
  MoreVertical,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

export const COLUMNS = [
  { key: 'INTERESTED', label: 'Interested', icon: BookOpenCheck, tone: 'text-sky-500 dark:text-sky-400', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20' },
  { key: 'APPLIED', label: 'Applied', icon: BriefcaseBusiness, tone: 'text-indigo-500 dark:text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' },
  { key: 'INTERVIEW', label: 'Interview', icon: Clock3, tone: 'text-amber-500 dark:text-amber-400', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  { key: 'OFFER', label: 'Offer', icon: Gift, tone: 'text-emerald-500 dark:text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2, tone: 'text-teal-500 dark:text-teal-400', badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20' },
  { key: 'REJECTED', label: 'Rejected', icon: CircleAlert, tone: 'text-rose-500 dark:text-rose-400', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' },
  { key: 'WITHDRAWN', label: 'Withdrawn', icon: XCircle, tone: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
];

export const ALL_STATUSES = [
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function KanbanBoard({
  applications = [],
  onStatusChange,
  onEdit,
  onDelete,
  onScheduleInterview,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  const isMatchingColumn = (appStatus, columnKey) => {
    if (columnKey === 'INTERESTED') {
      return appStatus === 'INTERESTED' || appStatus === 'SAVED';
    }
    if (columnKey === 'INTERVIEW') {
      return appStatus === 'INTERVIEW' || appStatus === 'ASSESSMENT';
    }
    return appStatus === columnKey;
  };

  return (
    <div className="w-full overflow-x-auto pb-4 pt-1 rounded-2xl">
      <div className="grid grid-cols-7 gap-2 min-w-[1020px] xl:min-w-0 xl:w-full items-start">
        {COLUMNS.map((col) => {
          const items = applications.filter((app) => isMatchingColumn(app.status, col.key));

          return (
            <div
              key={col.key}
              className="flex flex-col min-w-0 rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-slate-100/70 dark:bg-navy-900/60 p-2 sm:p-2.5 shadow-xs dark:shadow-card transition-colors"
            >
              {/* Column Header */}
              <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/80 dark:border-navy-700/80 pb-2 px-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <col.icon className={`h-3.5 w-3.5 shrink-0 ${col.tone}`} />
                  <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200" title={col.label}>
                    {col.label}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${col.badge}`}>
                  {items.length}
                </span>
              </div>

              {/* Column Items */}
              <div className="space-y-2 min-w-0">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200/90 dark:border-navy-700/70 bg-white/40 dark:bg-navy-950/30 p-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    No roles
                  </div>
                ) : (
                  items.map((app) => {
                    const title = app.jobTitle || app.job?.title || 'Unknown Role';
                    const company = app.company || app.job?.company || 'Company';
                    const location = app.location || app.job?.location;
                    const salary = app.offerSalary || app.salary || app.job?.salary;

                    return (
                      <div
                        key={app._id}
                        className="group relative rounded-xl border border-slate-200/90 dark:border-navy-700 bg-white dark:bg-navy-850 p-2.5 shadow-xs transition-all duration-150 hover:border-slate-300 dark:hover:border-navy-600 hover:shadow-md dark:hover:shadow-card-hover min-w-0"
                      >
                        {/* Top row: Role & Action Dropdown */}
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h4
                              className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors cursor-pointer"
                              title={title}
                              onClick={() => onEdit(app)}
                            >
                              {title}
                            </h4>
                            <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5" title={company}>
                              {company}
                            </p>
                          </div>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === app._id ? null : app._id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-white transition"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {activeMenuId === app._id ? (
                              <div className="absolute right-0 top-6 z-30 w-36 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 py-1 shadow-2xl backdrop-blur-md animate-scale-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onEdit(app);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-brand-500" /> Edit
                                </button>
                                {onScheduleInterview ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onScheduleInterview(app);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                                  >
                                    <Clock3 className="h-3.5 w-3.5 text-amber-500" /> Interview
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDelete(app);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Location & Salary pills */}
                        {(location || salary) ? (
                          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400 min-w-0">
                            {location ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-navy-900 px-1.5 py-0.5 truncate max-w-full text-slate-700 dark:text-slate-300"
                                title={location}
                              >
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                <span className="truncate">{location}</span>
                              </span>
                            ) : null}
                            {salary ? (
                              <span
                                className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-full"
                                title={salary}
                              >
                                {salary}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Timeline & Details */}
                        <div className="mt-2 space-y-1 text-[10px] min-w-0">
                          {app.appliedAt ? (
                            <div className="text-slate-500 dark:text-slate-400 truncate">
                              Applied: <span className="text-slate-700 dark:text-slate-300 font-semibold">{new Date(app.appliedAt).toLocaleDateString()}</span>
                            </div>
                          ) : null}
                          {app.interviewDate ? (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                onScheduleInterview && onScheduleInterview(app, app.interviews?.[0] || null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onScheduleInterview && onScheduleInterview(app, app.interviews?.[0] || null);
                                }
                              }}
                              className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 truncate cursor-pointer hover:underline"
                              title={`Interview scheduled: ${new Date(app.interviewDate).toLocaleDateString()} — Click to view or manage`}
                            >
                              <Clock3 className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{new Date(app.interviewDate).toLocaleDateString()}</span>
                            </div>
                          ) : null}
                          {app.nextAction ? (
                            <div className="text-sky-600 dark:text-sky-400 truncate font-semibold" title={app.nextAction}>
                              Next: {app.nextAction}
                            </div>
                          ) : null}
                        </div>

                        {/* Quick Move Status Selector */}
                        <div className="mt-2.5 border-t border-slate-100 dark:border-navy-700/80 pt-2 flex items-center justify-between gap-1 min-w-0">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">Stage:</span>
                          <select
                            value={app.status === 'SAVED' ? 'INTERESTED' : app.status}
                            onChange={(e) => onStatusChange(app._id, e.target.value)}
                            className="w-full min-w-0 truncate rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 shadow-xs"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st.key} value={st.key}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
