import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { fmtLongDay, fmtTime, money } from '../lib/format.js';
import { nowStr } from '../client/helpers.js';
import { Empty, ErrorNote, PageHead, Panel, Stat, Status } from '../components/ui.jsx';
import { ApptActions, ApptDetail, NewBooking } from './shared.jsx';

export default function StaffToday() {
  const today = useApi('/stats/today');
  const [open, setOpen] = useState(null);
  const [booking, setBooking] = useState(false);
  const list = today.data?.appointments || [];
  const live = list.filter((a) => a.status !== 'cancelled');
  const now = nowStr();
  const nextUp = live.find((a) => ['pending', 'confirmed'].includes(a.status) && a.endAt >= now);
  const done = live.filter((a) => a.status === 'completed');
  const replace = (a) => today.setData((d) => ({ ...d, appointments: d.appointments.map((x) => (x.id === a.id ? a : x)) }));

  return (
    <>
      <PageHead title="Today" sub={today.data ? `${fmtLongDay(today.data.date)}${today.data.scope ? ' · your chair' : ' · whole studio'}` : ''}>
        <button type="button" className="btn" onClick={() => setBooking(true)}>New booking</button>
      </PageHead>
      <ErrorNote error={today.error} />
      {today.data && (
        <div className="stat-row">
          <Stat label="Booked today" value={live.length} note={`${list.length - live.length} cancelled`} />
          <Stat label="Done so far" value={done.length} note={money(done.reduce((s, a) => s + a.priceCents, 0)) + ' taken'} />
          <Stat label="Expected today" value={money(live.filter((a) => a.status !== 'no_show').reduce((s, a) => s + a.priceCents, 0))} />
          <Stat label="Next 7 days" value={today.data.next7.count} note={`${money(today.data.next7.valueCents)} booked`} />
        </div>
      )}

      {nextUp && (
        <Panel title="Up next" className="next-panel">
          <div className="next">
            <p className="next-when display">{fmtTime(nextUp.startAt)} &middot; {nextUp.clientName}</p>
            <p className="next-what">{nextUp.serviceName} with {nextUp.staffName}{nextUp.notes && <> &middot; <em>{nextUp.notes}</em></>}</p>
            <ApptActions appt={nextUp} onChange={replace} />
          </div>
        </Panel>
      )}

      <Panel title="The day's book">
        {list.length ? (
          <table className="table clickable">
            <thead><tr><th>Time</th><th>Client</th><th>Service</th><th>Stylist</th><th className="num">Price</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className={a.endAt < now ? 'is-past' : ''}>
                  <td className="num"><button type="button" className="linkish" onClick={() => setOpen(a)}>{fmtTime(a.startAt)}–{fmtTime(a.endAt)}</button></td>
                  <td>{a.clientName}</td>
                  <td>{a.serviceName}</td>
                  <td>{a.staffName}</td>
                  <td className="num">{money(a.priceCents)}</td>
                  <td><Status value={a.status} /></td>
                  <td><ApptActions appt={a} onChange={replace} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>{today.loading ? 'Loading…' : 'The studio is closed today, or nothing is booked yet.'}</Empty>}
      </Panel>

      {open && <ApptDetail appt={open} onClose={() => setOpen(null)} onChange={replace} />}
      {booking && <NewBooking onClose={() => setBooking(false)} onDone={() => { setBooking(false); today.reload(); }} />}
    </>
  );
}
