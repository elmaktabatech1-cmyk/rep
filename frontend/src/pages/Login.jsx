import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Toast from '../components/Toast.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-field px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded border border-line bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-brand">ERP System</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-gray-600">Enter your workspace credentials.</p>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input className="w-full rounded border border-line px-3 py-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
          <input className="w-full rounded border border-line px-3 py-2" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        </label>
        <button className="w-full rounded bg-brand px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <Toast />
    </main>
  );
}
