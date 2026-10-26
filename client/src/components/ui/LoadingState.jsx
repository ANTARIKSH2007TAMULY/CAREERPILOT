import { Loader2 } from 'lucide-react';
import React from 'react';

export default function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex min-h-[260px] items-center justify-center p-6 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600/30 to-accent-500/20 border border-brand-500/30 shadow-glow-brand">
          <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
        </div>
        <p className="text-xs font-medium text-slate-400 tracking-wide animate-pulse">
          {label}
        </p>
      </div>
    </div>
  );
}
