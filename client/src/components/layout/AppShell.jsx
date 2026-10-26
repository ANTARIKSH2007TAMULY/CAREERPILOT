import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../ui/BrandLogo';
import ThemeToggle from '../ui/ThemeToggle';
import Sidebar from './Sidebar';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/jobs': 'Discover Opportunities',
  '/saved-jobs': 'Saved Roles',
  '/applications': 'Application Tracker',
  '/resume': 'Resume & Credentials',
  '/analytics': 'Pipeline Analytics',
  '/ai-coach': 'AI Career Coach',
  '/profile': 'Candidate Profile',
  '/settings': 'System Settings',
};

export default function AppShell() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Handle ESC key for mobile drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
        setUserDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/jobs/') ? 'Job Details' : 'CareerPilot');

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-slate-900 dark:bg-navy-950 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      <div className="flex flex-1 min-h-screen">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden lg:block lg:w-60 xl:w-64 shrink-0">
          <div className="fixed top-0 bottom-0 left-0 w-60 xl:w-64 z-30">
            <Sidebar />
          </div>
        </div>

        {/* Mobile Slide-Over Drawer with Backdrop */}
        {mobileDrawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 max-w-xs w-full z-50 flex animate-slide-up shadow-2xl">
              <Sidebar onCloseMobile={() => setMobileDrawerOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute top-4 right-4 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Application Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-20 h-16 border-b border-slate-200/90 dark:border-navy-700/80 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md transition-colors duration-200">
            <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              {/* Left: Mobile Menu + Mobile BrandLogo + Breadcrumb Context */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition lg:hidden shadow-xs"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <div className="lg:hidden">
                  <BrandLogo variant="icon" size="xs" linkTo="/dashboard" />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Workspace
                  </span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate font-display">
                    {currentTitle}
                  </span>
                </div>
              </div>

              {/* Right: Quick Actions, Theme Toggle, & Profile Dropdown */}
              <div className="flex items-center gap-2.5">
                <Link
                  to="/ai-coach"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-500/20 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition hover:bg-brand-100 dark:hover:bg-brand-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  <span>AI Coach</span>
                </Link>

                <Link
                  to="/jobs"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-navy-600 hover:text-slate-900 dark:hover:text-white shadow-xs"
                >
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Jobs</span>
                </Link>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-navy-700 mx-1 hidden sm:block" />

                {/* Accessible Theme Selector */}
                <ThemeToggle variant="segmented" />

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 px-2 py-1.5 text-left transition hover:border-slate-300 dark:hover:border-navy-600 shadow-xs focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                      {user?.name || 'Account'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {userDropdownOpen ? (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-1.5 shadow-xl backdrop-blur-md z-40 animate-slide-up">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-navy-700/80 mb-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user?.name || 'Candidate'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user?.email || 'Authenticated'}
                        </p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white transition"
                      >
                        <CircleUserRound className="h-4 w-4 text-slate-400" />
                        Candidate Profile
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white transition"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        Settings & Calendar
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-navy-700/80" />

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content Container */}
          <main className="flex-1 px-3 py-5 sm:px-5 lg:px-6 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
