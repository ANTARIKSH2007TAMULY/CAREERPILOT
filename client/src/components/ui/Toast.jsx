import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React, { useEffect } from 'react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'border-emerald-500/30 bg-slate-900/95 text-emerald-300 shadow-glow-emerald',
  error: 'border-rose-500/30 bg-slate-900/95 text-rose-300',
  info: 'border-brand-500/30 bg-slate-900/95 text-brand-300 shadow-glow-brand',
};

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const Icon = icons[type] || CheckCircle2;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${
          styles[type] || styles.success
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-medium text-slate-100">{message}</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
