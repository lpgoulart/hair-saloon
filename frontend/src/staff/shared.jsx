import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { fmtDuration, fmtLongDay, fmtTime, money } from '../lib/format.js';
import BookingFlow from '../components/BookingFlow.jsx';
import { ErrorNote, Modal, Stars, Status } from '../components/ui.jsx';
import { isStylist, useAuth } from '../lib/auth.jsx';

/** For a stylist, bookings and moves stay in their own chair. */
function useLockedStaff() {
  const { user } = useAuth();
  return isStylist(user) ? user.id : undefined;
}

/** Buttons that move an appointment through its states. */
export function ApptActions({ appt, onChange, compact }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = async (status) => {
    setBusy(true); setErr(null);
    try {
      const a = status === 'cancelled'
        ? await api(`/appointments/${appt.id}/cancel`, { method: 'POST' })
        : await api(`/appointments/${appt.id}`, { method: 'PATCH', body: { status } });
      onChange?.(a);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const s = appt.status;
  const cls = `btn ${compact ? 'small' : ''}`;
  return (
    <div className="act-row">
      {s === 'pending' && <button className={cls} disabled={busy} onClick={() => set('confirmed')}>Confirm</button>}
      {(s === 'pending' || s === 'confirmed') && <button className={cls} disabled={busy} onClick={() => set('completed')}>Done</button>}
      {(s === 'pending' || s === 'confirmed') && <button className={`${cls} ghost`} disabled={busy} onClick={() => set('no_show')}>No-show</button>}
      {(s === 'pending' || s === 'confirmed') && <button className={`${cls} ghost`} disabled={busy} onClick={() => set('cancelled')}>Cancel</button>}
      {(s === 'completed' || s === 'no_show' || s === 'cancelled') && (
        <button className={`${cls} ghost`} disabled={busy} onClick={() => set('confirmed')}>Reopen</button>
      )}
      <ErrorNote error={err} />
    </div>
  );
}

export function ApptDetail({ appt: initial, onClose, onChange }) {
  const [appt, setAppt] = useState(initial);
  const [notes, setNotes] = useState(initial.staffNotes || '');
  const [moving, setMoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lockStaffId = useLockedStaff();
  const update = (a) => { setAppt(a); onChange?.(a); };
  const saveNotes = async () => {
    const a = await api(`/appointments/${appt.id}`, { method: 'PATCH', body: { staffNotes: notes } });
    update(a); setSaved(true);
  };
  return (
    <Modal title={`${appt.serviceName} · ${appt.clientName}`} onClose={onClose} wide={moving}>
      {moving ? (
        <>
          <BookingFlow reschedule={appt} lockStaffId={lockStaffId} onDone={(a) => { update(a); setMoving(false); }} />
          <button type="button" className="linkish" onClick={() => setMoving(false)}>Back to details</button>
        </>
      ) : (
        <div className="detail">
          <dl className="detail-list">
            <dt>When</dt><dd>{fmtLongDay(appt.startAt)}, {fmtTime(appt.startAt)} to {fmtTime(appt.endAt)} ({fmtDuration(appt.durationMin)})</dd>
            <dt>Stylist</dt><dd>{appt.staffName}</dd>
            <dt>Client</dt><dd>{appt.clientName}<br /><a href={`mailto:${appt.clientEmail}`}>{appt.clientEmail}</a>{appt.clientPhone && <> &middot; <a href={`tel:${appt.clientPhone}`}>{appt.clientPhone}</a></>}</dd>
            <dt>Price</dt><dd>{money(appt.priceCents)}</dd>
            <dt>Status</dt><dd><Status value={appt.status} /></dd>
            {appt.notes && (<><dt>Client note</dt><dd>{appt.notes}</dd></>)}
            {appt.rating && (<><dt>Rating</dt><dd><Stars value={appt.rating} />{appt.review && <> &ldquo;{appt.review}&rdquo;</>}</dd></>)}
          </dl>
          <label className="field">
            <span>Staff notes (formula, preferences)</span>
            <textarea rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} />
          </label>
          <div className="row-gap">
            <button type="button" className="btn ghost small" onClick={saveNotes}>{saved ? 'Notes saved' : 'Save notes'}</button>
            {['pending', 'confirmed'].includes(appt.status) && <button type="button" className="btn ghost small" onClick={() => setMoving(true)}>Move</button>}
          </div>
          <ApptActions appt={appt} onChange={update} />
        </div>
      )}
    </Modal>
  );
}

/** Staff create a booking for an existing or new client. */
export function NewBooking({ onClose, onDone, initial }) {
  const [q, setQ] = useState('');
  const [client, setClient] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [err, setErr] = useState(null);
  const lockStaffId = useLockedStaff();
  const clients = useApi(q.length >= 2 ? '/clients' : null, { q, lookup: 1 });

  const create = async (e) => {
    e.preventDefault();
    setErr(null);
    try { setClient(await api('/clients', { method: 'POST', body: form })); setCreating(false); } catch (e2) { setErr(e2); }
  };

  return (
    <Modal title="New booking" onClose={onClose} wide>
      {!client ? (
        <div className="form">
          {!creating ? (
            <>
              <label className="field">
                <span>Find the client by name, email or phone</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </label>
              {clients.data && (
                <ul className="pick-list">
                  {clients.data.slice(0, 8).map((c) => (
                    <li key={c.id}><button type="button" onClick={() => setClient(c)}><strong>{c.name}</strong> <span className="muted">{c.email}{c.phone && <> &middot; {c.phone}</>}</span></button></li>
                  ))}
                  {!clients.data.length && <li className="muted">No client found.</li>}
                </ul>
              )}
              <button type="button" className="linkish" onClick={() => setCreating(true)}>New client instead</button>
            </>
          ) : (
            <form className="form" onSubmit={create}>
              <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="field"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <ErrorNote error={err} />
              <div className="row-gap"><button className="btn">Add client</button><button type="button" className="linkish" onClick={() => setCreating(false)}>Search instead</button></div>
            </form>
          )}
        </div>
      ) : (
        <>
          <p className="picked">Booking for <strong>{client.name}</strong> <button type="button" className="linkish" onClick={() => setClient(null)}>change</button></p>
          <BookingFlow clientId={client.id} initial={initial} lockStaffId={lockStaffId} onDone={onDone} submitLabel="Book for client" />
        </>
      )}
    </Modal>
  );
}
