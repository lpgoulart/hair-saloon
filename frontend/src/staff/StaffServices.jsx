import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { fmtDuration, money } from '../lib/format.js';
import { ErrorNote, Modal, PageHead, Panel } from '../components/ui.jsx';
import { isManager, useAuth } from '../lib/auth.jsx';

const BLANK = { name: '', category: 'Cut & style', description: '', durationMin: 60, priceCents: 5000, active: true };

export default function StaffServices() {
  const manager = isManager(useAuth().user);
  const list = useApi('/services', { all: manager ? 1 : undefined });
  const [edit, setEdit] = useState(null);
  const rows = list.data || [];
  return (
    <>
      <PageHead title="Services" sub={manager ? 'Prices and durations shown on the website and used for booking.' : 'The studio price list. Only the manager can change it.'}>
        {manager && <button type="button" className="btn" onClick={() => setEdit(BLANK)}>Add service</button>}
      </PageHead>
      <Panel>
        <ErrorNote error={list.error} />
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Service</th><th>Category</th><th className="num">Duration</th><th className="num">Price</th><th>On the website</th><th><span className="visually-hidden">Edit</span></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={s.active ? '' : 'is-past'}>
                  <td><strong>{s.name}</strong><br /><span className="muted">{s.description}</span></td>
                  <td>{s.category}</td>
                  <td className="num">{fmtDuration(s.durationMin)}</td>
                  <td className="num">{money(s.priceCents)}</td>
                  <td>{s.active ? 'Yes' : 'Hidden'}</td>
                  <td>{manager && <button type="button" className="btn ghost small" onClick={() => setEdit({ ...s, active: !!s.active })}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {edit && <ServiceForm initial={edit} categories={[...new Set(rows.map((r) => r.category))]} onClose={() => setEdit(null)} onDone={() => { setEdit(null); list.reload(); }} />}
    </>
  );
}

function ServiceForm({ initial, categories, onClose, onDone }) {
  const [f, setF] = useState({ ...initial, price: (initial.priceCents / 100).toFixed(2) });
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const body = { ...f, durationMin: Number(f.durationMin), priceCents: Math.round(Number(f.price) * 100) };
    try {
      await api(initial.id ? `/services/${initial.id}` : '/services', { method: initial.id ? 'PUT' : 'POST', body });
      onDone();
    } catch (e2) { setErr(e2); }
  };
  return (
    <Modal title={initial.id ? `Edit ${initial.name}` : 'Add a service'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Name</span><input required value={f.name} onChange={set('name')} /></label>
        <label className="field">
          <span>Category</span>
          <input required list="cats" value={f.category} onChange={set('category')} />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="field"><span>Description</span><textarea rows={2} value={f.description} onChange={set('description')} /></label>
        <div className="grid-2 tight">
          <label className="field"><span>Duration (minutes)</span><input type="number" min={15} max={480} step={15} required value={f.durationMin} onChange={set('durationMin')} /></label>
          <label className="field"><span>Price ($)</span><input type="number" min={0} step="0.01" required value={f.price} onChange={set('price')} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /> Show on the website and allow booking</label>
        <ErrorNote error={err} />
        <button className="btn">{initial.id ? 'Save' : 'Add service'}</button>
      </form>
    </Modal>
  );
}
