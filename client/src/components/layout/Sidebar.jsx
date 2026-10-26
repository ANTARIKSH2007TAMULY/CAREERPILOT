import {
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  CircleUserRound,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
} from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../ui/BrandLogo';

const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Discovery & AI',
    items: [
      { label: 'Discover Jobs', to: '/jobs', icon: BriefcaseBusiness },
      { label: 'Saved Roles', to: '/saved-jobs', icon: Bookmark },
      { label: 'AI Career Coach', to: '/ai-coach', icon: MessageSquareText, badge: 'AI' },
    ],
  },
  {
    title: 'Career Pipeline',
    items: [
      { label: 'Application Tracker', to: '/applications', icon: FolderKanban },
      { label: 'Resume & Fit', to: '/resume', icon: FileText },
      { label: 'Pipeline Analytics', to: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Candidate Profile', to: '/profile', icon: CircleUserRound },
      { label: 'System Settings', to: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ onCloseMobile = null }) {
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200/90 dark:border-navy-700/80 bg-white/95 dark:bg-navy-900/95 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-200/90 dark:border-navy-700/80 px-5">
        <BrandLogo variant="badge" size="sm" linkTo="/dashboard" />
      </div>

      {/* Grouped Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.title}
            </div>
            {group.items.map(({ label, to, icon: Icon, badge }) => (
              <NavLink
                key={label}
                to={to}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-white font-semibold border border-brand-500/30 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-navy-850 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                        }`}
                      />
                      <span>{label}</span>
                    </div>

                    {badge ? (
                      <span className="rounded-full border border-accent-500/30 bg-accent-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-300">
                        {badge}
                      </span>
                    ) : null}

                    {isActive ? (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-brand-500" />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User & Logout Footer */}
      <div className="border-t border-slate-200/90 dark:border-navy-700/80 p-3 bg-slate-50/80 dark:bg-navy-950/60">
        <div className="flex items-center justify-between gap-2 rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-navy-850">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {user?.name || 'Candidate'}
              </div>
              <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {user?.email || 'Logged in'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-800 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
