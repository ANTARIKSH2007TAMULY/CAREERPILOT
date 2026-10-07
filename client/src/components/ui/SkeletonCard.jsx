export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="h-4 w-24 rounded bg-slate-700" />
      <div className="mt-4 h-8 w-2/3 rounded bg-slate-700" />
      <div className="mt-3 h-4 w-full rounded bg-slate-800" />
      <div className="mt-2 h-4 w-5/6 rounded bg-slate-800" />
      <div className="mt-5 flex gap-2">
        <div className="h-8 w-20 rounded bg-slate-700" />
        <div className="h-8 w-20 rounded bg-slate-800" />
      </div>
    </div>
  );
}
