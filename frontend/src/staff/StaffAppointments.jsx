import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { addDays, fmtDay, fmtTime, money, STATUS_LABEL, today } from '../lib/format.js';
import { Empty, ErrorNote, PageHead, Panel, Status } from '../components/ui.jsx';
import { ApptActions, ApptDetail, NewBooking } from './shared.jsx';
import { isStylist, useAuth } from '../lib/auth.jsx';

export default function StaffAppointments() {
  const [f, setF] = useState({ from: today(), to: addDays(today(), 14), status: '', staffId: '', q: '' });
  const [open, setOpen] = useState(null);
  const [booking, setBooking] = useState(false);
  const stylist = isStylist(useAuth().user);
  const stylists = useApi(stylist ? null : '/stylists');
  const list = useApi('/appointments', { ...f, limit: 1000 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rows = list.data || [];
  const value = rows.filter((a) => a.status !== 'cancelled').reduce((s, a) => s + a.priceCents, 0);
  const replace = (a) => list.setData((d) => d.map((x) => (x.id === a.id ? a : x)));

  return (
    <>
      <PageHead title="Appointments" sub={`${rows.length} found · ${money(value)} excluding cancellations`}>
        <button type="button" className="btn" onClick={() => setBooking(true)}>New booking</button>
      </PageHead>
      <Panel>
        <div className="filters">
          <label className="field"><span>From</span><input type="date" value={f.from} onChange={set('from')} /></label>
          <label className="field"><span>To</span><input type="date" value={f.to} onChange={set('to')} /></label>
          <label className="field">
            <span>Status</span>
            <select value={f.status} onChange={set('status')}>
              <option value="">Any</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {!stylist && (
            <label className="field">
              <span>Stylist</span>
              <select value={f.staffId} onChange={set('staffId')}>
                <option value="">Everyone</option>
                {(stylists.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          <label className="field grow"><span>Search client or service</span><input type="search" value={f.q} onChange={set('q')} /></label>
        </div>
        <ErrorNote error={list.error} />
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Service</th>{!stylist && <th>Stylist</th>}<th className="num">Price</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><button type="button" className="linkish" onClick={() => setOpen(a)}>{fmtDay(a.startAt)}</button></td>
                    <td className="num">{fmtTime(a.startAt)}</td>
                    <td>{a.clientName}</td>
                    <td>{a.serviceName}</td>
                    {!stylist && <td>{a.staffName}</td>}
                    <td className="num">{money(a.priceCents)}</td>
                    <td><Status value={a.status} /></td>
                    <td><ApptActions appt={a} onChange={replace} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{list.loading ? 'Loading…' : 'No appointments match these filters.'}</Empty>}
      </Panel>
      {open && <ApptDetail appt={open} onClose={() => setOpen(null)} onChange={replace} />}
      {booking && <NewBooking onClose={() => setBooking(false)} onDone={() => { setBooking(false); list.reload(); }} />}
    </>
  );
}
