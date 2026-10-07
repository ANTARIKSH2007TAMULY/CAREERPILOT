export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
