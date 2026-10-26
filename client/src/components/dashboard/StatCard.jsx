import React from 'react';

const toneClasses = {
  sky: {
    badge: 'border-sky-500/20 bg-sky-50 text-sky-700 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300',
    iconAura: 'from-sky-500/20 to-transparent',
  },
  indigo: {
    badge: 'border-brand-500/20 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300',
    iconAura: 'from-brand-500/20 to-transparent',
  },
  emerald: {
    badge: 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    iconAura: 'from-emerald-500/20 to-transparent',
  },
  amber: {
    badge: 'border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    iconAura: 'from-amber-500/20 to-transparent',
  },
  violet: {
    badge: 'border-purple-500/20 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300',
    iconAura: 'from-purple-500/20 to-transparent',
  },
  rose: {
    badge: 'border-rose-500/20 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    iconAura: 'from-rose-500/20 to-transparent',
  },
};

export default function StatCard({
  label,
  value,
  tone = 'indigo',
  icon: Icon,
  trend = null,
  trendLabel = null,
  description = null,
  className = '',
}) {
  const currentTone = toneClasses[tone] || toneClasses.indigo;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-navy-700/80 dark:bg-navy-850/80 dark:shadow-card dark:hover:border-navy-600 dark:hover:bg-navy-850 dark:hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
            {value}
          </div>
          {description ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${currentTone.badge} shadow-xs transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      {trend !== null && trendLabel ? (
        <div className="mt-3.5 flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-navy-700/60 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{trend}</span>
          <span className="text-slate-500 dark:text-slate-400">{trendLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
