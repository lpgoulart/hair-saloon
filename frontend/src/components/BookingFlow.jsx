import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { addDays, fmtDay, fmtDuration, money, parseLocal, today } from '../lib/format.js';
import { ErrorNote } from './ui.jsx';

const CLOSED = new Set([0, 1]); // Sunday, Monday

/**
 * Service → stylist → day → time → confirm.
 * reschedule: an appointment to move (service fixed).
 * clientId: when staff book on behalf of a client.
 */
export default function BookingFlow({ initial = {}, reschedule, clientId, onDone, submitLabel, lockStaffId }) {
  const services = useApi('/services');
  const stylists = useApi('/stylists');
  const [serviceId, setServiceId] = useState(reschedule?.serviceId || Number(initial.serviceId) || null);
  // 0 = any stylist. A stylist booking for their own chair is locked to themselves.
  const [staffId, setStaffId] = useState(lockStaffId || Number(initial.staffId) || reschedule?.staffId || 0);
  const [date, setDate] = useState(initial.date || reschedule?.startAt.slice(0, 10) || firstOpenDay());
  const [pick, setPick] = useState(initial.time ? { time: initial.time, staffId: Number(initial.staffId) || null } : null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const service = services.data?.find((s) => s.id === serviceId);
  const avail = useApi(serviceId ? '/availability' : null, { date, serviceId, staffId: staffId || undefined, ignoreId: reschedule?.id });

  // merge stylists for "any stylist"
  const slots = useMemo(() => {
    if (!avail.data) return [];
    const m = new Map();
    for (const s of avail.data) for (const t of s.slots) if (!m.has(t)) m.set(t, { time: t, staffId: s.staffId, staffName: s.staffName });
    return [...m.values()].sort((a, b) => a.time.localeCompare(b.time));
  }, [avail.data]);

  // keep a preselected time only if it is really free
  useEffect(() => {
    if (pick && avail.data && !slots.some((s) => s.time === pick.time && (!pick.staffId || avail.data.find((x) => x.staffId === pick.staffId)?.slots.includes(pick.time)))) setPick(null);
    if (pick && !pick.staffId && slots.length) {
      const s = slots.find((x) => x.time === pick.time);
      if (s) setPick(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avail.data]);

  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(today(), i)), []);
  const grouped = useMemo(() => {
    const g = new Map();
    (services.data || []).forEach((s) => { if (!g.has(s.category)) g.set(s.category, []); g.get(s.category).push(s); });
    return [...g.entries()];
  }, [services.data]);

  const submit = async () => {
    if (!service || !pick) return;
    setBusy(true); setErr(null);
    try {
      const body = { date, time: pick.time, staffId: pick.staffId, serviceId: service.id, notes: notes || undefined, clientId };
      const appt = reschedule
        ? await api(`/appointments/${reschedule.id}/reschedule`, { method: 'POST', body: { date, time: pick.time, staffId: pick.staffId } })
        : await api('/appointments', { method: 'POST', body });
      onDone?.(appt);
    } catch (e) {
      setErr(e);
      avail.reload();
    } finally { setBusy(false); }
  };

  return (
    <div className="booking">
      {!reschedule && (
        <fieldset className="book-step">
          <legend>Service</legend>
          <ErrorNote error={services.error} />
          {grouped.map(([cat, list]) => (
            <div key={cat} className="book-cat">
              <p className="book-cat-name">{cat}</p>
              <div className="choice-grid">
                {list.map((s) => (
                  <label key={s.id} className={`choice ${serviceId === s.id ? 'is-on' : ''}`}>
                    <input type="radio" name="service" checked={serviceId === s.id} onChange={() => { setServiceId(s.id); setPick(null); }} />
                    <span className="choice-main">{s.name}</span>
                    <span className="choice-meta">{fmtDuration(s.durationMin)} &middot; {money(s.priceCents)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {!lockStaffId && <fieldset className="book-step">
        <legend>Stylist</legend>
        <div className="chip-row">
          <label className={`chip ${staffId === 0 ? 'is-on' : ''}`}>
            <input type="radio" name="staff" checked={staffId === 0} onChange={() => { setStaffId(0); setPick(null); }} />
            Any stylist
          </label>
          {(stylists.data || []).map((s) => (
            <label key={s.id} className={`chip ${staffId === s.id ? 'is-on' : ''}`}>
              <input type="radio" name="staff" checked={staffId === s.id} onChange={() => { setStaffId(s.id); setPick(null); }} />
              {s.name} <span className="chip-sub">{s.title}</span>
            </label>
          ))}
        </div>
      </fieldset>}

      <fieldset className="book-step">
        <legend>Day</legend>
        <div className="day-strip" role="radiogroup" aria-label="Day">
          {days.map((d) => {
            const closed = CLOSED.has(parseLocal(d).getDay());
            return (
              <button type="button" role="radio" aria-checked={date === d} key={d} disabled={closed}
                className={`day ${date === d ? 'is-on' : ''}`} onClick={() => { setDate(d); setPick(null); }}>
                <span className="day-wd">{fmtDay(d, { weekday: 'short' })}</span>
                <span className="day-n">{parseLocal(d).getDate()}</span>
                <span className="day-m">{closed ? 'Closed' : fmtDay(d, { month: 'short' })}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="book-step">
        <legend>Time</legend>
        {!service && <p className="muted">Choose a service to see free times.</p>}
        {service && avail.loading && <p className="muted">Checking the book…</p>}
        <ErrorNote error={avail.error} />
        {service && !avail.loading && !slots.length && <p className="muted">No free time on this day. Try another day or any stylist.</p>}
        <div className="slot-grid">
          {slots.map((s) => {
            const on = pick?.time === s.time;
            return (
              <button type="button" key={s.time} className={`slot ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setPick(s)}>
                <span className="slot-time">{s.time}</span>
                {!staffId && <span className="slot-who">{s.staffName.split(' ')[0]}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      {!reschedule && (
        <label className="field book-notes">
          <span>Anything we should know? (optional)</span>
          <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, the shade you liked last time, a photo you will bring…" />
        </label>
      )}

      <div className="book-summary" aria-live="polite">
        <p>
          {service && pick
            ? <><strong>{service.name}</strong> with {pick.staffName || stylists.data?.find((s) => s.id === pick.staffId)?.name} on {fmtDay(date, { weekday: 'long', day: 'numeric', month: 'long' })} at {pick.time} &middot; {money(service.priceCents)}</>
            : 'Choose a service, a day and a time.'}
        </p>
        <ErrorNote error={err} />
        <button type="button" className="btn" disabled={!service || !pick || busy} onClick={submit}>
          {busy ? 'Booking…' : submitLabel || (reschedule ? 'Move appointment' : 'Confirm booking')}
        </button>
      </div>
    </div>
  );
}

function firstOpenDay() {
  let d = today();
  for (let i = 0; i < 7 && CLOSED.has(parseLocal(d).getDay()); i++) d = addDays(d, 1);
  return d;
}
