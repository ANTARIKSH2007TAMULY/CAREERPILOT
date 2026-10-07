import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingState from '../components/ui/LoadingState';
import api from '../services/api';

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [summaryResponse, trendResponse] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/trends'),
        ]);
        setSummary(summaryResponse.data?.data || null);
        setTrendData(trendResponse.data?.data?.monthlyTrend || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <LoadingState label="Loading analytics…" />;
  }

  const statusData = (summary?.statusBreakdown || []).map((entry) => ({
    name: entry.status,
    value: entry.count,
  }));

  const typeData = (summary?.jobTypeBreakdown || []).map((entry) => ({
    name: entry.name,
    value: entry.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Analytics</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Outcome trends</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Response rate', `${summary?.summary?.responseRate || 0}%`],
          ['Interview conversion', `${summary?.metrics?.interviewConversion || 0}%`],
          ['Offer conversion', `${summary?.metrics?.offerConversion || 0}%`],
          ['Rejection rate', `${summary?.metrics?.rejectionRate || 0}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 text-lg font-semibold text-white">Applications over time</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="applications" stroke="#38bdf8" fill="url(#areaFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 text-lg font-semibold text-white">Applications by status</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={35} fill="#8884d8" label>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 text-lg font-semibold text-white">Applications by job type</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 text-lg font-semibold text-white">Work mode distribution</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(summary?.workModeBreakdown || []).map((entry) => ({ name: entry.name, value: entry.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
