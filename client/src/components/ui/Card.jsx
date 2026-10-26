import React from 'react';

export default function Card({
  children,
  className = '',
  interactive = false,
  glow = false,
  ...props
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/90 dark:border-navy-700/80 dark:bg-navy-850/80 backdrop-blur-sm shadow-xs dark:shadow-card transition-all duration-200 ${
        interactive
          ? 'hover:border-slate-300 dark:hover:border-navy-600 hover:bg-white dark:hover:bg-navy-850 hover:shadow-md dark:hover:shadow-card-hover cursor-pointer'
          : ''
      } ${glow ? 'shadow-glow-brand border-brand-500/40 dark:border-brand-500/30' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-5 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-base font-semibold text-slate-900 dark:text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 pt-3 border-t border-slate-200/80 dark:border-navy-700/60 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
