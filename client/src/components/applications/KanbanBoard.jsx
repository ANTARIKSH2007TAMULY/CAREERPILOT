import { BookOpenCheck, BriefcaseBusiness, CircleAlert, Clock3, Gift, Sparkles } from 'lucide-react';

const columns = [
  { key: 'SAVED', label: 'Saved', icon: BookOpenCheck },
  { key: 'APPLIED', label: 'Applied', icon: BriefcaseBusiness },
  { key: 'ASSESSMENT', label: 'Assessment', icon: Sparkles },
  { key: 'INTERVIEW', label: 'Interview', icon: Clock3 },
  { key: 'OFFER', label: 'Offer', icon: Gift },
  { key: 'REJECTED', label: 'Rejected', icon: CircleAlert },
];

export default function KanbanBoard({ applications }) {
  return (
    <div className="grid gap-4 xl:grid-cols-6">
      {columns.map((column) => {
        const items = (applications || []).filter((app) => app.status === column.key);

        return (
          <div key={column.key} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <column.icon className="h-4 w-4" />
                {column.label}
              </div>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">{items.length}</span>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-3 text-center text-xs text-slate-500">
                  No items
                </div>
              ) : (
                items.map((app) => (
                  <div key={app._id} className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
                    <div className="text-sm font-medium text-white">{app.job?.title || 'Role'}</div>
                    <div className="mt-1 text-xs text-slate-400">{app.job?.company || 'Company'}</div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                      <span>{app.status}</span>
                      <span className={app.deadline ? 'text-amber-300' : 'text-slate-500'}>{app.deadline ? 'Deadline' : 'No date'}</span>
                    </div>
                    {app.nextAction ? <div className="mt-2 text-[11px] text-sky-300">Next: {app.nextAction}</div> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
