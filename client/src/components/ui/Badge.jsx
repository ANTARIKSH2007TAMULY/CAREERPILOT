import React from 'react';

const variants = {
  default: 'border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300',
  brand: 'border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300',
  accent: 'border-sky-500/20 dark:border-accent-500/30 bg-sky-50 dark:bg-accent-500/10 text-sky-700 dark:text-accent-300',
  emerald: 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/20 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/20 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  purple: 'border-purple-500/20 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
};

const dotColors = {
  default: 'bg-slate-400',
  brand: 'bg-brand-500',
  accent: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-sm transition-colors ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant] || 'bg-current'} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      ) : null}
      {children}
    </span>
  );
}
