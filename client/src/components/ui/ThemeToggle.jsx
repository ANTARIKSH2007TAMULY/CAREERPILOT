import { Laptop, Moon, Sun } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ variant = 'segmented', className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Segmented Pill Version (as shown in reference image navbar)
  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-0.5 shadow-xs backdrop-blur-sm ${className}`}
        role="group"
        aria-label="Theme selector"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
            theme === 'light'
              ? 'bg-white text-amber-500 shadow-xs dark:bg-slate-800 dark:text-amber-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Light theme"
          aria-label="Switch to light theme"
          aria-pressed={theme === 'light'}
        >
          <Sun className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
            theme === 'dark'
              ? 'bg-navy-850 text-indigo-400 shadow-xs dark:bg-slate-800 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Dark theme"
          aria-label="Switch to dark theme"
          aria-pressed={theme === 'dark'}
        >
          <Moon className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
            theme === 'system'
              ? 'bg-white text-brand-600 shadow-xs dark:bg-slate-800 dark:text-brand-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="System theme"
          aria-label="Follow system theme"
          aria-pressed={theme === 'system'}
        >
          <Laptop className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Dropdown / Compact Button Version
  const CurrentIcon = theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        title={`Current theme: ${theme} (${resolvedTheme})`}
        aria-label="Change theme"
        aria-expanded={dropdownOpen}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {dropdownOpen ? (
        <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-xl backdrop-blur-md z-50 animate-slide-up">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setDropdownOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              theme === 'light'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setDropdownOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              theme === 'dark'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setDropdownOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              theme === 'system'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Laptop className="h-3.5 w-3.5 text-brand-500" />
            <span>System</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
