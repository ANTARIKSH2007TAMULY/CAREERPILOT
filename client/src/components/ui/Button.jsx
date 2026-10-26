import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm hover:from-brand-500 hover:to-indigo-500 active:from-brand-700 active:to-indigo-700 focus-visible:ring-brand-500/50 border border-brand-400/20',
  secondary:
    'bg-white dark:bg-navy-850 border border-slate-200 dark:border-navy-700/80 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-navy-600 shadow-xs focus-visible:ring-slate-500/40',
  accent:
    'bg-gradient-to-r from-sky-500 to-brand-500 text-white font-semibold shadow-sm hover:from-sky-400 hover:to-brand-400 focus-visible:ring-sky-400/50',
  outline:
    'bg-transparent border border-slate-300 dark:border-navy-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-navy-600 focus-visible:ring-slate-500/40',
  ghost:
    'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800/80 hover:text-slate-900 dark:hover:text-slate-200 focus-visible:ring-slate-500/40',
  danger:
    'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 focus-visible:ring-rose-500/40',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  sm: 'px-3 py-1.5 text-xs font-medium rounded-xl gap-2',
  md: 'px-4 py-2 text-sm font-medium rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base font-medium rounded-xl gap-2.5',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconPosition = 'left',
    type = 'button',
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 ${
        variants[variant] || variants.secondary
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}

      {children}

      {!loading && Icon && iconPosition === 'right' ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
    </button>
  );
});

export default Button;
