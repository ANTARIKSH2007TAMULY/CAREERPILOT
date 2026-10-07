import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-soft">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 font-semibold text-white">C</div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Your career momentum is waiting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500" placeholder="you@example.com" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500" placeholder="••••••••" required />
          </div>

          {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Need an account? <Link to="/register" className="text-sky-300">Create one</Link>
        </div>
      </div>
    </div>
  );
}
