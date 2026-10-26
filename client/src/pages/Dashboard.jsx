import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  FolderKanban,
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { jobService } from '../services/jobService';

const RANGE_OPTIONS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '6m', label: '6 months' },
];

const statusBadgeVariants = {
  INTERESTED: 'default',
  SAVED: 'default',
  APPLIED: 'accent',
  INTERVIEW: 'purple',
  OFFER: 'emerald',
  ACCEPTED: 'emerald',
  REJECTED: 'rose',
  WITHDRAWN: 'amber',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [trendRange, setTrendRange] = useState('6m');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme-aware chart colors
  const gridStroke = isDark ? '#1e294a' : '#e2e8f0';
  const textStroke = isDark ? '#94a3b8' : '#64748b';
  const axisStroke = isDark ? '#2a3a66' : '#cbd5e1';
  const tooltipBg = isDark ? '#111a30' : '#ffffff';
  const tooltipBorder = isDark ? '#1e294a' : '#e2e8f0';
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a';

  // Initial dashboard load
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [summaryResponse, jobsResponse, trendResponse] = await Promise.all([
          api.get('/analytics/summary'),
          jobService.getJobs({ limit: 4, page: 1 }).catch(() => ({ data: { data: { jobs: [] } } })),
          api.get('/analytics/trends?range=6m').catch(() => ({ data: { data: { trend: [] } } })),
        ]);
        setSummary(summaryResponse.data?.data || null);
        setJobs(jobsResponse.data?.data?.jobs || jobsResponse.data?.jobs || []);
        setTrendData(trendResponse.data?.data?.trend || trendResponse.data?.data?.monthlyTrend || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Fetch trend data whenever range changes
  const handleRangeChange = async (newRange) => {
    if (newRange === trendRange) return;
    setTrendRange(newRange);
    setTrendLoading(true);
    try {
      const response = await api.get(`/analytics/trends?range=${newRange}`);
      const data = response.data?.data?.trend || response.data?.data?.monthlyTrend || [];
      setTrendData(data);
    } catch (error) {
      console.error('Failed to update trend range:', error);
    } finally {
      setTrendLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading career command center…" />;
  }

  if (!summary) {
    return (
      <EmptyState
        title="Dashboard analytics unavailable"
        description="Your career metrics are still synchronizing. Try refreshing in a moment."
      />
    );
  }

  const totalApps = summary.summary?.totalApplications || 0;
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Page Header with contextual greeting */}
      <PageHeader
        badge="Command Center"
        badgeIcon={Sparkles}
        title={`Welcome back, ${firstName}`}
        description="Monitor your job discovery radar, pipeline velocity, upcoming deadlines, and AI insights."
      >
        <Link to="/applications">
          <Button variant="primary" size="sm" icon={Plus}>
            New Application
          </Button>
        </Link>
        <Link to="/jobs">
          <Button variant="secondary" size="sm" icon={Compass}>
            Discover Roles
          </Button>
        </Link>
      </PageHeader>

      {/* Metric Cards - 100% Derived from Real Data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Applications"
          value={summary.summary?.totalApplications ?? 0}
          tone="indigo"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Active Pipeline"
          value={summary.summary?.activeApplications ?? 0}
          tone="emerald"
          icon={Activity}
        />
        <StatCard
          label="Interviews"
          value={summary.summary?.interviews ?? 0}
          tone="violet"
          icon={CalendarDays}
        />
        <StatCard
          label="Offers"
          value={summary.summary?.offers ?? 0}
          tone="amber"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Response Rate"
          value={`${summary.summary?.responseRate ?? 0}%`}
          tone="sky"
          icon={TrendingUp}
        />
      </div>

      {/* Middle Row: Dynamic Activity Graph + Upcoming Deadlines */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-navy-700/60">
            <div>
              <CardTitle>Application Momentum</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Applications recorded across your selected window
              </p>
            </div>

            {/* Date range filter buttons */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-100 dark:bg-navy-950 p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleRangeChange(opt.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    trendRange === opt.key
                      ? 'bg-brand-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-5 flex-1">
            <div className="h-64 relative">
              {trendLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-navy-900/70 backdrop-blur-xs rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
              ) : null}

              {totalApps === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-400 mb-3">
                    <ClipboardCheck className="h-6 w-6 text-brand-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No applications tracked yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Add target jobs to your application pipeline to view your automated activity graph.
                  </p>
                  <Link to="/jobs" className="mt-4">
                    <Button variant="primary" size="sm">
                      Browse Jobs
                    </Button>
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#635BFF" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke={textStroke}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: axisStroke }}
                    />
                    <YAxis
                      stroke={textStroke}
                      allowDecimals={false}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: axisStroke }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 91, 255, 0.08)' }}
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        fontSize: '12px',
                        color: tooltipColor,
                      }}
                    />
                    <Bar
                      dataKey="applications"
                      fill="url(#dashboardBarGradient)"
                      radius={[6, 6, 0, 0]}
                      name="Applications"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines Card */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-slate-100 dark:border-navy-700/60 pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <span>Upcoming Milestones</span>
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Application and interview deadlines</p>
          </CardHeader>

          <CardContent className="pt-4 flex-1">
            {(summary.upcomingDeadlines || []).length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-navy-700/80 bg-slate-50/50 dark:bg-navy-950/40 p-4 text-center">
                <CalendarDays className="h-7 w-7 text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No deadlines pending</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[200px]">
                  Add interview or submission deadlines to your tracked applications.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(summary.upcomingDeadlines || []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3 hover:border-slate-300 dark:hover:border-navy-600 transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.company}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.role}</div>
                    </div>
                    <Badge variant="amber" size="sm">
                      {new Date(item.deadline).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Applications + Recommended Jobs */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Recent Applications Card */}
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700/60 pb-3">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="/applications" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition">
              View all tracker
            </Link>
          </CardHeader>

          <CardContent className="pt-4">
            {(summary.recentApplications || []).length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-navy-700/80 bg-slate-50/50 dark:bg-navy-950/40 p-4 text-center">
                <FolderKanban className="h-6 w-6 text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No recent application updates</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(summary.recentApplications || []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3 hover:border-slate-300 dark:hover:border-navy-600 transition"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.role}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.company}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={statusBadgeVariants[item.status] || 'default'} size="sm">
                        {item.status}
                      </Badge>
                      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {item.appliedAt
                          ? `Applied ${new Date(item.appliedAt).toLocaleDateString()}`
                          : item.updatedAt
                          ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}`
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Jobs Card */}
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700/60 pb-3">
            <CardTitle>Discovery Radar</CardTitle>
            <Link to="/jobs" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition">
              Explore catalog
            </Link>
          </CardHeader>

          <CardContent className="pt-4">
            {jobs.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-navy-700/80 bg-slate-50/50 dark:bg-navy-950/40 p-4 text-center">
                <Compass className="h-6 w-6 text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No job recommendations available</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {jobs.slice(0, 4).map((job) => (
                  <div
                    key={job._id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/70 p-3 hover:border-slate-300 dark:hover:border-navy-600 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/jobs/${job._id}`}
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition truncate block"
                      >
                        {job.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {job.company} • {job.location ? (job.workMode && job.workMode !== 'Unspecified' ? `${job.location} · ${job.workMode}` : job.location) : (job.workMode || 'Unspecified')}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {typeof job.matchScore === 'number' ? (
                        <Badge variant="brand" size="sm">
                          {job.matchScore}%
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {job.jobType || 'Full-time'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
