import { AlertCircle, CheckCircle2, ChevronRight, HelpCircle, Lightbulb, Sparkles, Zap } from 'lucide-react';
import React from 'react';
import Badge from '../ui/Badge';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';

export default function MatchPanel({ match }) {
  if (!match) {
    return null;
  }

  const score = match.matchScore || 0;
  const isHighMatch = score >= 80;
  const isMidMatch = score >= 60;

  const scoreBadgeVariant = isHighMatch ? 'emerald' : isMidMatch ? 'accent' : 'amber';

  return (
    <Card className="overflow-hidden border-brand-500/30 bg-gradient-to-b from-brand-50/50 via-white to-white dark:from-navy-900/90 dark:to-navy-950 shadow-xs dark:shadow-glow-brand">
      <CardHeader className="border-b border-slate-200 dark:border-navy-700/80 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Candidate Fit Analysis</CardTitle>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Powered by Google Gemini 3.5</div>
            </div>
          </div>

          <Badge variant={scoreBadgeVariant} size="lg" className="font-bold text-sm px-3">
            {score}% match
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Summary */}
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {match.summary}
        </p>

        {/* Strengths & Missing Skills Grid */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          {/* Strengths */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Matching Strengths</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {(match.strengths || []).length > 0 ? (
                match.strengths.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-emerald-500 dark:text-emerald-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-[11px] text-slate-400 dark:text-slate-500">None detected from profile skills</li>
              )}
            </ul>
          </div>

          {/* Missing Skills */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Skill Gaps</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {(match.missingSkills || []).length > 0 ? (
                match.missingSkills.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-amber-500 dark:text-amber-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-[11px] text-slate-400 dark:text-slate-500">Strong alignment with requirements</li>
              )}
            </ul>
          </div>
        </div>

        {/* Recommendations if present */}
        {Array.isArray(match.recommendations) && match.recommendations.length > 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/80 p-3 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-1">
              <Zap className="h-3 w-3 text-brand-500 dark:text-brand-400" /> Recommendation
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {match.recommendations[0]}
            </p>
          </div>
        ) : null}

        {/* Honest Disclaimer */}
        {match.disclaimer ? (
          <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200 dark:border-navy-700/60">
            <HelpCircle className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
            <span>{match.disclaimer}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
