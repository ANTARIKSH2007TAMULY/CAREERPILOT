export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-lg text-slate-200">•</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
