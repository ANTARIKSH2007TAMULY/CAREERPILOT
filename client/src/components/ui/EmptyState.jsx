import { Inbox } from 'lucide-react';
import React from 'react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-slate-200 dark:border-navy-700 bg-white/60 dark:bg-navy-850/40 p-8 text-center sm:p-12 backdrop-blur-sm shadow-xs ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-navy-800 dark:to-navy-900 border border-slate-200 dark:border-navy-700 text-brand-600 dark:text-brand-400 shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight sm:text-lg">
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
