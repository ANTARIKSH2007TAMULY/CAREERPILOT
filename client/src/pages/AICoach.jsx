import { SendHorizonal } from 'lucide-react';
import { useState } from 'react';
import { aiService } from '../services/aiService';

export default function AICoach() {
  const [message, setMessage] = useState('Which jobs should I prioritize?');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await aiService.chat({ message });
      setAnswer(response.data?.data?.answer || 'No answer returned.');
    } catch (error) {
      setAnswer(error.message || 'Unable to get coaching advice right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">AI coach</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Ask about your next move</h1>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
            placeholder="Which jobs should I prioritize?"
          />

          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60">
            <SendHorizonal className="h-4 w-4" />
            {loading ? 'Thinking…' : 'Ask CareerPilot'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
        <div className="text-lg font-semibold text-white">Coach response</div>
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
          {answer || 'Your advice will appear here once you ask a question.'}
        </div>
      </div>
    </div>
  );
}
