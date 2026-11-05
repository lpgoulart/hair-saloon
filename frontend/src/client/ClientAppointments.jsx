import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { fmtDuration, fmtLongDay, fmtTime, money, nowStr } from './helpers.js';
import BookingFlow from '../components/BookingFlow.jsx';
import { Empty, ErrorNote, Modal, PageHead, Panel, Stars, Status } from '../components/ui.jsx';

export default function ClientAppointments() {
  const list = useApi('/appointments', { order: 'desc', limit: 200 });
  const [moving, setMoving] = useState(null);
  const [rating, setRating] = useState(null);
  const [err, setErr] = useState(null);
  const now = nowStr();

  const all = list.data || [];
  const upcoming = all.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.startAt >= now).reverse();
  const past = all.filter((a) => !upcoming.includes(a));

  const cancel = async (a) => {
    if (!window.confirm(`Cancel ${a.serviceName} on ${fmtLongDay(a.startAt)} at ${fmtTime(a.startAt)}?`)) return;
    setErr(null);
    try { await api(`/appointments/${a.id}/cancel`, { method: 'POST' }); list.reload(); } catch (e) { setErr(e); }
  };

  return (
    <>
      <PageHead title="My appointments" sub="Move or cancel anything upcoming, and rate the visits you have had.">
        <Link to="/account/book" className="btn">Book a visit</Link>
      </PageHead>
      <ErrorNote error={list.error || err} />

      <Panel title={`Upcoming (${upcoming.length})`}>
        {upcoming.length ? (
          <ul className="appt-list">
            {upcoming.map((a) => (
              <li key={a.id} className="appt">
                <div className="appt-when">
                  <p className="appt-day">{fmtLongDay(a.startAt)}</p>
                  <p className="appt-time display">{fmtTime(a.startAt)}</p>
                </div>
                <div className="appt-what">
                  <p><strong>{a.serviceName}</strong></p>
                  <p className="muted">with {a.staffName} &middot; {fmtDuration(a.durationMin)} &middot; {money(a.priceCents)}</p>
                  {a.notes && <p className="muted">Your note: {a.notes}</p>}
                </div>
                <div className="appt-act">
                  <Status value={a.status} />
                  <button type="button" className="btn ghost small" onClick={() => setMoving(a)}>Move</button>
                  <button type="button" className="btn ghost small" onClick={() => cancel(a)}>Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty>Nothing booked. <Link to="/account/book">Book a visit</Link></Empty>}
      </Panel>

      <Panel title="History">
        {past.length ? (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Service</th><th>Stylist</th><th className="num">Price</th><th>Status</th><th>Your rating</th></tr>
            </thead>
            <tbody>
              {past.map((a) => (
                <tr key={a.id}>
                  <td>{fmtLongDay(a.startAt)}, {fmtTime(a.startAt)}</td>
                  <td>{a.serviceName}</td>
                  <td>{a.staffName}</td>
                  <td className="num">{money(a.priceCents)}</td>
                  <td><Status value={a.status} /></td>
                  <td>
                    {a.status === 'completed'
                      ? (a.rating ? <Stars value={a.rating} /> : <button type="button" className="linkish" onClick={() => setRating(a)}>Rate this visit</button>)
                      : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Your past visits will appear here.</Empty>}
      </Panel>

      {moving && (
        <Modal title={`Move ${moving.serviceName}`} onClose={() => setMoving(null)} wide>
          <BookingFlow reschedule={moving} onDone={() => { setMoving(null); list.reload(); }} />
        </Modal>
      )}
      {rating && <RateModal appt={rating} onClose={() => setRating(null)} onDone={() => { setRating(null); list.reload(); }} />}
    </>
  );
}

function RateModal({ appt, onClose, onDone }) {
  const [value, setValue] = useState(5);
  const [review, setReview] = useState('');
  const [err, setErr] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try { await api(`/appointments/${appt.id}/review`, { method: 'POST', body: { rating: value, review } }); onDone(); } catch (e2) { setErr(e2); }
  };
  return (
    <Modal title={`Rate ${appt.serviceName} with ${appt.staffName}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <fieldset className="rate-row">
          <legend>Rating</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`rate ${value >= n ? 'on' : ''}`}>
              <input type="radio" name="rating" value={n} checked={value === n} onChange={() => setValue(n)} />
              <span aria-hidden="true">★</span><span className="visually-hidden">{n} stars</span>
            </label>
          ))}
        </fieldset>
        <label className="field"><span>A few words (optional)</span><textarea rows={3} value={review} onChange={(e) => setReview(e.target.value)} /></label>
        <ErrorNote error={err} />
        <button className="btn">Send rating</button>
      </form>
    </Modal>
  );
}
