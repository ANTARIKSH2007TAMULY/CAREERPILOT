import { UploadCloud } from 'lucide-react';
import { useState } from 'react';

export default function Resume() {
  const [filename, setFilename] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Resume</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Career materials</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="flex items-center gap-3 text-lg font-semibold text-white">
            <UploadCloud className="h-5 w-5 text-sky-300" />
            Upload resume
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center">
            <UploadCloud className="h-8 w-8 text-slate-400" />
            <span className="mt-3 text-sm text-slate-300">Drop a PDF or DOCX here</span>
            <input type="file" className="hidden" onChange={(event) => setFilename(event.target.files?.[0]?.name || '')} />
          </label>

          {filename ? <div className="mt-4 text-sm text-sky-300">Selected file: {filename}</div> : null}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="text-lg font-semibold text-white">Resume information</div>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
              <div className="mt-2 text-base font-medium text-white">Ready for future ATS analysis</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Future architecture</div>
              <div className="mt-2 text-sm text-slate-300">Resume parsing, ATS scoring, keyword gap detection, and job-to-resume comparison are designed as modular future enhancements.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
        <div className="text-lg font-semibold text-white">AI resume analysis</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ['Keyword alignment', 'Coming soon'],
            ['ATS readiness', 'Planned'],
            ['Skill gap review', 'Planned'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
              <div className="mt-2 text-base font-medium text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
