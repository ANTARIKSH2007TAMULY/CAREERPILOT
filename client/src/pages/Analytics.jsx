import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  PieChart as PieIcon,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const STATUS_COLORS = {
  INTERESTED: '#38bdf8', // sky
  SAVED: '#0284c7', // light blue
  APPLIED: '#6366f1', // indigo
  ASSESSMENT: '#a855f7', // purple
  INTERVIEW: '#f59e0b', // amber
  OFFER: '#10b981', // emerald
  ACCEPTED: '#14b8a6', // teal
  REJECTED: '#f43f5e', // rose
  WITHDRAWN: '#64748b', // slate
};

const RANGE_OPTIONS = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '6m', label: 'Last 6 months' },
];

export default function Analytics() {
  const { isDark } = useTheme();
  const [summary, setSummary] = useState(null);
  const [trendRange, setTrendRange] = useState('6m');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme-aware chart tokens
  const gridStroke = isDark ? '#1e294a' : '#e2e8f0';
  const textStroke = isDark ? '#94a3b8' : '#64748b';
  const axisStroke = isDark ? '#2a3a66' : '#cbd5e1';
  const tooltipBg = isDark ? '#111a30' : '#ffffff';
  const tooltipBorder = isDark ? '#1e294a' : '#e2e8f0';
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a';
  const pieSliceStroke = isDark ? '#111a30' : '#ffffff';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [summaryResponse, trendResponse] = await Promise.all([
          api.get('/analytics/summary'),
          api.get(`/analytics/trends?range=${trendRange}`),
        ]);
        setSummary(summaryResponse.data?.data || null);
        setTrendData(trendResponse.data?.data?.trend || trendResponse.data?.data?.monthlyTrend || []);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleRangeChange = async (newRange) => {
    if (newRange === trendRange) return;
    setTrendRange(newRange);
    setTrendLoading(true);
    try {
      const response = await api.get(`/analytics/trends?range=${newRange}`);
      setTrendData(response.data?.data?.trend || response.data?.data?.monthlyTrend || []);
    } catch (error) {
      console.error('Failed to update trend range:', error);
    } finally {
      setTrendLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Computing pipeline analytics…" />;
  }

  const totalApps = summary?.summary?.totalApplications || 0;
  const submittedApps = summary?.summary?.submittedApplications || 0;

  // Filter out zero-count entries from pie chart
  const statusData = (summary?.statusBreakdown || [])
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      name: entry.status,
      value: entry.count,
    }));

  const typeData = (summary?.jobTypeBreakdown || []).filter((entry) => entry.count > 0);
  const workModeData = (summary?.workModeBreakdown || []).filter((entry) => entry.count > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Intelligence"
        badgeIcon={BarChart3}
        title="Application Analytics"
        description="Conversion rates, response timelines, and stage distributions derived from your pipeline."
      />

      {/* KPI Conversion Rate Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Response Rate"
          value={`${summary?.summary?.responseRate ?? 0}%`}
          tone="sky"
          description={`Responses / ${submittedApps} submitted roles`}
        />
        <StatCard
          icon={Clock}
          label="Interview Conversion"
          value={`${summary?.metrics?.interviewConversion ?? 0}%`}
          tone="amber"
          description={`Interviews / ${submittedApps} submitted roles`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Offer Conversion"
          value={`${summary?.metrics?.offerConversion ?? 0}%`}
          tone="emerald"
          description={`Offers / ${summary?.summary?.interviews ?? 0} interviewed roles`}
        />
        <StatCard
          icon={XCircle}
          label="Rejection Rate"
          value={`${summary?.metrics?.rejectionRate ?? 0}%`}
          tone="rose"
          description={`Rejections / ${submittedApps} submitted roles`}
        />
      </div>

      {/* Applications Over Time + Applications by Status */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Trend Area Chart */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Applications over time</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recorded application activity across timeline</p>
            </div>
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
          </div>

          <div className="h-64 relative">
            {trendLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-navy-900/80 backdrop-blur-xs">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              </div>
            ) : null}

            {totalApps === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                No application history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#635BFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#635BFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={textStroke}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <YAxis
                    stroke={textStroke}
                    allowDecimals={false}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '0.75rem',
                      color: tooltipColor,
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                    }}
                    cursor={{ stroke: '#635BFF', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="#635BFF"
                    strokeWidth={2}
                    fill="url(#analyticsAreaFill)"
                    name="Applications"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Applications by stage</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Distribution across hiring pipeline</p>
          </div>

          <div className="h-64">
            {statusData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                <PieIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                No tracked applications to distribute.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={85}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || '#6366f1'}
                        stroke={pieSliceStroke}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '0.75rem',
                      color: tooltipColor,
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {statusData.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 dark:border-navy-700/60 pt-3">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.name] || '#6366f1' }}
                  />
                  <span>{entry.name}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Applications by Job Type + Work Mode Distribution */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Job Type Bar Chart */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Applications by job type</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Full-time, contract, internship breakups</p>
          </div>

          <div className="h-64">
            {typeData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                No job type classifications recorded in current pipeline.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={textStroke}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <YAxis
                    stroke={textStroke}
                    allowDecimals={false}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '0.75rem',
                      color: tooltipColor,
                      fontSize: '12px',
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Work Mode Bar Chart */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Work mode distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Remote, hybrid, and onsite preferences</p>
          </div>

          <div className="h-64">
            {workModeData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                No work mode classifications recorded in current pipeline.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workModeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={textStroke}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <YAxis
                    stroke={textStroke}
                    allowDecimals={false}
                    tick={{ fill: textStroke, fontSize: 11 }}
                    axisLine={{ stroke: axisStroke }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '0.75rem',
                      color: tooltipColor,
                      fontSize: '12px',
                    }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
