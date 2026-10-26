import React from 'react';

export default function SkeletonCard({ variant = 'job' }) {
  if (variant === 'stat') {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/60 p-5 shadow-xs dark:shadow-card">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800/80" />
        </div>
        <div className="mt-4 h-8 w-24 rounded-lg bg-slate-300 dark:bg-slate-700/80" />
        <div className="mt-2 h-3.5 w-36 rounded-md bg-slate-200 dark:bg-slate-800/60" />
      </div>
    );
  }

  return (
    <div className="animate-pulse flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/60 p-5 shadow-xs dark:shadow-card">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800/70" />
              <div className="h-5 w-44 rounded bg-slate-300 dark:bg-slate-700/80" />
            </div>
          </div>
          <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800/70" />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800/60" />
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800/50" />
          <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800/50" />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-5 w-16 rounded-lg bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-5 w-16 rounded-lg bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-5 w-14 rounded-lg bg-slate-200 dark:bg-slate-800/60" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-navy-700/60 pt-3.5">
        <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800/60" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
