import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable BrandLogo component for CareerPilot.
 * Renders the hand-authored geometric paper-plane symbol and wordmark.
 */
export default function BrandLogo({
  variant = 'full', // 'full' | 'icon' | 'badge'
  size = 'md',      // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  theme = 'auto',   // 'auto' | 'light' | 'dark'
  linkTo = null,
  className = '',
}) {
  const sizeStyles = {
    xs: { icon: 'h-6 w-6', text: 'text-base', badge: 'text-[9px] px-1 py-0.2' },
    sm: { icon: 'h-7 w-7', text: 'text-lg', badge: 'text-[10px] px-1.5 py-0.5' },
    md: { icon: 'h-9 w-9', text: 'text-xl', badge: 'text-[10px] px-2 py-0.5' },
    lg: { icon: 'h-11 w-11', text: 'text-2xl', badge: 'text-xs px-2.5 py-0.5' },
    xl: { icon: 'h-14 w-14', text: 'text-3xl', badge: 'text-xs px-3 py-1' },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // Text color behavior
  const textColorClass =
    theme === 'dark'
      ? 'text-white'
      : theme === 'light'
      ? 'text-[#0B1228]'
      : 'text-slate-900 dark:text-white';

  const logoContent = (
    <div className={`inline-flex items-center gap-2.5 select-none transition-opacity hover:opacity-95 ${className}`}>
      {/* Scalable Vector Paper-Plane Symbol */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${currentSize.icon} shrink-0 drop-shadow-sm`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bl-wing-top" x1="10" y1="40" x2="56" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="55%" stopColor="#635BFF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient id="bl-wing-bottom" x1="26" y1="40" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="60%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>

          <linearGradient id="bl-keel" x1="24" y1="36" x2="38" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>

          <radialGradient id="bl-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#635BFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="34" cy="30" r="24" fill="url(#bl-aura)" />

        <g transform="translate(1, 0)">
          {/* Keel */}
          <path d="M 27 41 L 34 50 L 38 41 Z" fill="url(#bl-keel)" opacity="0.95" />
          {/* Lower wing */}
          <path d="M 56 10 L 27 41 L 43 54 L 56 10 Z" fill="url(#bl-wing-bottom)" />
          {/* Upper wing */}
          <path d="M 56 10 L 9 34 L 27 41 L 56 10 Z" fill="url(#bl-wing-top)" />
          {/* Spine crease */}
          <path d="M 56 10 L 27 41" stroke="#E0E7FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </g>
      </svg>

      {/* Wordmark */}
      {variant !== 'icon' && (
        <div className="flex items-center gap-1.5 font-display font-extrabold tracking-tight">
          <span className={`${currentSize.text} ${textColorClass} transition-colors`}>
            Career<span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">Pilot</span>
          </span>

          {variant === 'badge' && (
            <span
              className={`rounded-full bg-brand-500/15 border border-brand-500/30 font-semibold text-brand-600 dark:text-brand-300 uppercase tracking-wider ${currentSize.badge}`}
            >
              PRO
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
