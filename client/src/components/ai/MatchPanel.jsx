export default function MatchPanel({ match }) {
  if (!match) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">AI match</div>
          <div className="mt-2 text-3xl font-semibold text-white">{match.matchScore || 0}%</div>
        </div>
        <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
          {match.provider || 'heuristic'}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">{match.summary}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-white">Strengths</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {(match.strengths || []).slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-sm font-medium text-white">Missing skills</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {(match.missingSkills || []).slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
