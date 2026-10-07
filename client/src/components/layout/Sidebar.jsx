import { BarChart3, BriefcaseBusiness, CircleUserRound, FileText, LayoutDashboard, MessageSquareText, Rocket, Settings, Sparkles, Bookmark, FolderKanban } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Discover Jobs', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'Saved Jobs', to: '/saved-jobs', icon: Bookmark },
  { label: 'Applications', to: '/applications', icon: FolderKanban },
  { label: 'AI Recommendations', to: '/jobs', icon: Sparkles },
  { label: 'AI Career Coach', to: '/ai-coach', icon: MessageSquareText },
  { label: 'Resume', to: '/resume', icon: FileText },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Profile', to: '/profile', icon: CircleUserRound },
  { label: 'Settings', to: '/settings', icon: Settings },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    isActive
      ? 'bg-slate-800 text-white shadow-soft border border-slate-700'
      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
  }`;

export default function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950/90 p-4 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 font-semibold text-white">C</div>
        <div>
          <div className="text-base font-semibold text-white">CareerPilot</div>
          <div className="text-xs text-slate-400">AI career OS</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink key={label} to={to} className={navLinkClass}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-sky-300">
          <Rocket className="h-4 w-4" />
          Career momentum
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Your applications, recommendations, and job pipeline in one view.
        </p>
      </div>
    </aside>
  );
}
