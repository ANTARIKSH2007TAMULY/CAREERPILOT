import React from 'react';

export default function PageHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  children,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 ${className}`}
    >
      <div>
        {badge ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            {BadgeIcon ? <BadgeIcon className="h-3 w-3" /> : null}
            {badge}
          </div>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl font-display">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {children ? (
        <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
          {children}
        </div>
      ) : null}
    </div>
  );
}
