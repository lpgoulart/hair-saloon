import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../lib/auth.jsx';
import { ErrorNote } from '../components/ui.jsx';

function AuthFrame({ title, sub, children }) {
  return (
    <div className="auth">
      <div className="auth-photo" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}assets/salon-de-coiffure-le-temps-d-une-2.jpg`} alt="" />
      </div>
      <div className="auth-side">
        <Link to="/" className="auth-mark display">Onda</Link>
        <div className="auth-box">
          <h1 className="page-title display">{title}</h1>
          <p className="page-sub">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const staff = params.get('staff') === '1';
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from || homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const u = await login(form.email, form.password);
      const from = loc.state?.from;
      nav(from && (from.startsWith('/staff') === (u.role !== 'client')) ? from : homeFor(u), { replace: true });
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  };

  return (
    <AuthFrame title={staff ? 'Staff sign in' : 'Sign in'} sub={staff ? 'Manage the book, clients and the numbers.' : 'See your visits, book and move appointments.'}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <ErrorNote error={err} />
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-alt">New here? <Link to="/register" state={loc.state}>Create an account</Link></p>
      <div className="demo-box">
        <p><strong>Demo accounts</strong>, password <code>onda1234</code></p>
        <div className="demo-buttons">
          <button type="button" className="btn ghost small" onClick={() => setForm({ email: 'client@onda.studio', password: 'onda1234' })}>Client</button>
          <button type="button" className="btn ghost small" onClick={() => setForm({ email: 'marina@onda.studio', password: 'onda1234' })}>Stylist</button>
          <button type="button" className="btn ghost small" onClick={() => setForm({ email: 'admin@onda.studio', password: 'onda1234' })}>Manager</button>
        </div>
      </div>
    </AuthFrame>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await register(form);
      nav(loc.state?.from?.startsWith('/account') ? loc.state.from : '/account', { replace: true });
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  };

  return (
    <AuthFrame title="Create an account" sub="Book online, keep every visit and colour formula in one place.">
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Full name</span><input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label className="field"><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label className="field"><span>Phone (optional)</span><input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></label>
        <label className="field">
          <span>Password</span>
          <input type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" value={form.password} onChange={set('password')} />
          <small id="pw-hint">At least 8 characters.</small>
        </label>
        <ErrorNote error={err} />
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="auth-alt">Already have one? <Link to="/login" state={loc.state}>Sign in</Link></p>
    </AuthFrame>
  );
}
