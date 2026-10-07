import { Bell, Menu, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

const mobileNavItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Jobs', to: '/jobs' },
  { label: 'Saved', to: '/saved-jobs' },
  { label: 'Applications', to: '/applications' },
  { label: 'AI Coach', to: '/ai-coach' },
  { label: 'Resume', to: '/resume' },
];

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 p-2 text-slate-200 lg:hidden"
                  onClick={() => setMobileNavOpen((value) => !value)}
                >
                  <Menu className="h-4 w-4" />
                </button>

                <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 md:flex">
                  <Search className="h-4 w-4 text-slate-400" />
                  Search jobs, skills, companies
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" className="rounded-xl border border-slate-700 p-2 text-slate-200">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-medium text-white">{user?.name || 'User'}</div>
                    <div className="text-[11px] text-slate-400">Product builder</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                >
                  Logout
                </button>
              </div>
            </div>

            {mobileNavOpen ? (
              <div className="border-t border-slate-800 bg-slate-950 p-3 lg:hidden">
                <div className="flex flex-wrap gap-2">
                  {mobileNavItems.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        `rounded-lg px-3 py-2 text-sm ${
                          isActive ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-300'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : null}
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
