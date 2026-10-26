import {
  AlertCircle,
  Bot,
  Clock,
  HelpCircle,
  Loader2,
  RefreshCw,
  SendHorizonal,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { aiService } from '../services/aiService';

const SUGGESTED_PROMPTS = [
  'Which jobs should I prioritize based on my current profile and skills?',
  'What skills should I learn next to improve my match rates for software roles?',
  'How do I structure my resume for early-career software engineering roles?',
  'How should I prepare for technical and behavioral interview loops?',
];

export default function AICoach() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your CareerPilot AI coach. Ask me about career positioning, resume strategies, interview preparation, or which job openings best match your qualifications.',
      disclaimer: null,
      generatedByAI: false,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const chatBottomRef = useRef(null);

  const fetchUsage = async () => {
    try {
      const response = await aiService.getUsage();
      if (response.data?.data) {
        setUsage(response.data.data);
      }
    } catch {
      // Usage endpoint non-fatal
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const dailyRemaining = usage?.daily?.requestsRemaining;
  const isDailyExhausted = typeof dailyRemaining === 'number' && dailyRemaining <= 0;
  const monthlyRemaining = usage?.monthly?.requestsRemaining;
  const isMonthlyExhausted = typeof monthlyRemaining === 'number' && monthlyRemaining <= 0;
  const isQuotaLocked = isDailyExhausted || isMonthlyExhausted;

  const handleAsk = async (textToSend) => {
    const query = String(textToSend || message).trim();
    if (!query || loading || isQuotaLocked) return;

    setQuotaError(null);
    const userEntry = { role: 'user', text: query };
    setMessages((prev) => [...prev, userEntry]);
    setMessage('');
    setLoading(true);

    try {
      const response = await aiService.chat({
        message: query,
        history: messages.slice(-6),
      });
      const data = response.data?.data || {};
      const answer = data.answer || 'No guidance returned.';
      const botEntry = {
        role: 'assistant',
        text: answer,
        provider: data.provider || 'assistant',
        generatedByAI: data.generatedByAI === true,
        disclaimer: data.disclaimer || null,
      };
      setMessages((prev) => [...prev, botEntry]);
    } catch (error) {
      const errPayload = error.response?.data?.error || error.response?.data;
      const status = error.response?.status;

      if (status === 429) {
        const errorMsg = errPayload?.message || 'AI request limit reached. Please wait before asking again.';
        const resetsAt = errPayload?.resetsAt ? new Date(errPayload.resetsAt).toLocaleTimeString() : 'soon';
        setQuotaError({
          message: errorMsg,
          code: errPayload?.code || 'QUOTA_EXCEEDED',
          resetsAt,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `[Quota Notice] ${errorMsg}`,
            error: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: errPayload?.message || error.message || 'Unable to get coaching advice right now.',
            error: true,
          },
        ]);
      }
    } finally {
      setLoading(false);
      fetchUsage();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAsk(message);
  };

  const formatResets = (iso) => {
    if (!iso) return 'midnight UTC';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Usage Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          category="Advisory Engine"
          categoryIcon={Sparkles}
          title="AI career coach"
          description="Tailored career guidance and interview prep powered by dual-key Gemini with persistent quotas."
        />

        {/* Live Usage Widget */}
        {usage ? (
          <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-4 shadow-xs dark:shadow-card backdrop-blur-sm sm:min-w-[300px]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> AI Usage Quota
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Resets {formatResets(usage.daily.resetsAt)}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Requests Today</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {usage.daily.requestsUsed} / {usage.daily.requestLimit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-navy-900 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDailyExhausted
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-brand-500 to-accent-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (usage.daily.requestsUsed / (usage.daily.requestLimit || 20)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-navy-700/80">
                <span>Monthly: <strong className="text-slate-700 dark:text-slate-300">{usage.monthly.requestsUsed}</strong>/{usage.monthly.requestLimit}</span>
                <span>Tokens: <strong className="text-slate-700 dark:text-slate-300">{usage.daily.tokensUsed.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Quota Exhaustion Alert Banner */}
      {isQuotaLocked || quotaError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-800 dark:text-amber-300">
              {quotaError ? quotaError.message : 'Daily AI limit reached'}
            </div>
            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-200/80 leading-relaxed">
              {isDailyExhausted
                ? `You have used all ${usage?.daily?.requestLimit || 20} requests for today. Quota resets at ${formatResets(usage?.daily?.resetsAt)}.`
                : isMonthlyExhausted
                ? `You have reached your monthly limit of ${usage?.monthly?.requestLimit || 300} requests. Quota resets next month.`
                : 'Please wait for your quota window to reset.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Suggested prompts strip */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleAsk(prompt)}
            disabled={loading || isQuotaLocked}
            className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:border-brand-500/40 hover:bg-slate-50 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-left shadow-xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/60 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
          {messages.map((item, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {item.role === 'assistant' ? (
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                    item.error
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/30'
                      : 'bg-brand-500/15 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/30'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                </div>
              ) : null}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  item.role === 'user'
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white font-medium shadow-sm'
                    : item.error
                    ? 'border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                    : 'border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/80 text-slate-800 dark:text-slate-200 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-line">{item.text}</p>
                {item.disclaimer ? (
                  <p className="mt-2 text-[11px] text-slate-500 italic border-t border-slate-200 dark:border-navy-700/60 pt-1.5">
                    {item.disclaimer}
                  </p>
                ) : null}
              </div>

              {item.role === 'user' ? (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-navy-800 text-brand-600 dark:text-slate-300 ring-1 ring-brand-200 dark:ring-navy-700">
                  <User className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          ))}

          {loading ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950/80 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 dark:text-brand-400" />
                CareerPilot is generating recommendations…
              </div>
            </div>
          ) : null}
          <div ref={chatBottomRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="mt-5 border-t border-slate-100 dark:border-navy-700/80 pt-4">
          <div className="flex gap-2.5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isQuotaLocked}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(message);
                }
              }}
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50/70 dark:bg-navy-950/90 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:bg-slate-100 dark:disabled:bg-navy-900/50 disabled:cursor-not-allowed"
              placeholder={
                isQuotaLocked
                  ? 'Daily AI request quota reached. Resets at midnight UTC.'
                  : 'Ask a question about your job search, interviews, or skills (Press Enter to send)…'
              }
            />
            <Button
              type="submit"
              variant="accent"
              disabled={loading || !message.trim() || isQuotaLocked}
              className="self-end h-11 px-4"
              icon={SendHorizonal}
            >
              <span className="hidden sm:inline">Ask</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
