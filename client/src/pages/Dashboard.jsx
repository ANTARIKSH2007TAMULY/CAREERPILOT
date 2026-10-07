import { Activity, ArrowUpRight, CalendarDays, CircleDollarSign, ClipboardCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import api from '../services/api';
import { jobService } from '../services/jobService';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [summaryResponse, jobsResponse] = await Promise.all([
          api.get('/analytics/summary'),
          jobService.getJobs({ limit: 3, page: 1 }),
        ]);
        setSummary(summaryResponse.data?.data || null);
        setJobs(jobsResponse.data?.data?.jobs || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingState label="Loading dashboard…" />;
  }

  if (!summary) {
    return <EmptyState title="Dashboard unavailable" description="Your analytics are still syncing. Try refreshing in a moment." />;
  }

  const chartData = [
    { name: 'Jan', applications: 12 },
    { name: 'Feb', applications: 16 },
    { name: 'Mar', applications: 18 },
    { name: 'Apr', applications: 15 },
    { name: 'May', applications: 21 },
    { name: 'Jun', applications: 24 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Overview</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Your application dashboard</h1>
        </div>
        <Link to="/jobs" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500">
          Discover jobs <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Applications" value={summary.summary.totalApplications || 0} tone="sky" icon={ClipboardCheck} />
        <StatCard label="Active Applications" value={summary.summary.activeApplications || 0} tone="emerald" icon={Activity} />
        <StatCard label="Interviews" value={summary.summary.interviews || 0} tone="violet" icon={CalendarDays} />
        <StatCard label="Offers" value={summary.summary.offers || 0} tone="amber" icon={CircleDollarSign} />
        <StatCard label="Response Rate" value={`${summary.summary.responseRate || 0}%`} tone="sky" icon={Sparkles} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Application activity</h2>
            <span className="text-sm text-slate-400">Last 6 months</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="applications" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-white">Upcoming deadlines</h2>
          <div className="mt-4 space-y-3">
            {(summary.upcomingDeadlines || []).map((item) => (
              <div key={item._id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-sm font-medium text-white">{item.company}</div>
                <div className="mt-1 text-xs text-slate-400">{item.role}</div>
                <div className="mt-2 text-[11px] text-amber-300">{new Date(item.deadline).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-white">Recent applications</h2>
          <div className="mt-4 space-y-3">
            {(summary.recentApplications || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div>
                  <div className="text-sm font-medium text-white">{item.role}</div>
                  <div className="text-xs text-slate-400">{item.company}</div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>{item.status}</div>
                  <div className="mt-1 text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-white">Recommended jobs</h2>
          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <div key={job._id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-white">{job.title}</div>
                    <div className="text-xs text-slate-400">{job.company}</div>
                  </div>
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300">{job.matchScore || 86}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
