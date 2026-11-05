import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { fmtLongDay } from '../lib/format.js';
import { ErrorNote, PageHead, Panel } from '../components/ui.jsx';

export default function ClientProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', password: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const u = await api('/auth/me', { method: 'PATCH', body: { ...form, password: form.password || undefined } });
      setUser(u); setForm((f) => ({ ...f, password: '' })); setMsg('Saved.');
    } catch (e2) { setErr(e2); }
  };

  return (
    <>
      <PageHead title="Profile" sub={`Member since ${fmtLongDay(user.createdAt.slice(0, 10))}.`} />
      <Panel>
        <form className="form narrow" onSubmit={submit}>
          <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Email</span><input value={user.email} disabled /></label>
          <label className="field"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="field">
            <span>New password</span>
            <input type="password" minLength={8} autoComplete="new-password" aria-describedby="pw-hint2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <small id="pw-hint2">Leave empty to keep your password. At least 8 characters.</small>
          </label>
          <ErrorNote error={err} />
          {msg && <p className="ok-note" role="status">{msg}</p>}
          <button className="btn">Save changes</button>
        </form>
      </Panel>
    </>
  );
}
