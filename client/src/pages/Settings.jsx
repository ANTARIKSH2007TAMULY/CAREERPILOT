import { Bell, Lock, ShieldCheck, Sparkles } from 'lucide-react';

const items = [
  { icon: Bell, label: 'Notifications', value: 'Enabled' },
  { icon: ShieldCheck, label: 'Security', value: 'Protected' },
  { icon: Lock, label: 'Auth mode', value: 'HTTP-only cookies' },
  { icon: Sparkles, label: 'AI access', value: 'Server-side only' },
];

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Settings</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Account controls</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-4 text-sm text-slate-400">{label}</div>
            <div className="mt-2 text-base font-medium text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="text-lg font-semibold text-white">Environment-safe configuration</div>
        <p className="mt-3 text-sm text-slate-300">
          AI keys, JWT secrets, and database credentials remain on the server. The frontend only receives the results it needs to render a polished experience.
        </p>
      </div>
    </div>
  );
}
