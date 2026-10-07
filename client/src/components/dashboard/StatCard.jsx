export default function StatCard({ label, value, tone = 'sky', icon: Icon }) {
  const toneClasses = {
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
      </div>
    </div>
  );
}
