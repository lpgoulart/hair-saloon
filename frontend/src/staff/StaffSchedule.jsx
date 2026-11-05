import { useMemo, useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { addDays, fmtLongDay, fmtTime, parseLocal, today as todayStr } from '../lib/format.js';
import { nowStr } from '../client/helpers.js';
import { Empty, ErrorNote, PageHead, Panel } from '../components/ui.jsx';
import { ApptDetail, NewBooking } from './shared.jsx';
import { isStylist, useAuth } from '../lib/auth.jsx';

const PX_PER_MIN = 1.6;
const toMin = (s) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));

export default function StaffSchedule() {
  const [date, setDate] = useState(todayStr());
  const [open, setOpen] = useState(null);
  const [booking, setBooking] = useState(null);
  const appts = useApi('/appointments', { from: date, to: date });
  const { user } = useAuth();
  const allStylists = useApi('/stylists');
  // A stylist sees only their own column.
  const stylists = { data: allStylists.data?.filter((s) => !isStylist(user) || s.id === user.id) };
  const hours = useApi('/hours');
  const day = parseLocal(date).getDay();
  const h = hours.data?.[day];
  const openMin = h ? Number(h.open.slice(0, 2)) * 60 : 8 * 60;
  const closeMin = h ? Number(h.close.slice(0, 2)) * 60 : 20 * 60;
  const ticks = useMemo(() => {
    const t = [];
    for (let m = openMin; m <= closeMin; m += 60) t.push(m);
    return t;
  }, [openMin, closeMin]);
  const now = nowStr();
  const nowMin = date === todayStr() ? toMin(now) : null;

  const visible = (appts.data || []).filter((a) => a.status !== 'cancelled');
  const replace = () => appts.reload();

  return (
    <>
      <PageHead title="Schedule" sub={fmtLongDay(date)}>
        <div className="date-nav">
          <button type="button" className="btn ghost small" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">Previous</button>
          <button type="button" className="btn ghost small" onClick={() => setDate(todayStr())}>Today</button>
          <button type="button" className="btn ghost small" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">Next</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Go to date" />
        </div>
        <button type="button" className="btn" onClick={() => setBooking({ date })}>New booking</button>
      </PageHead>
      <ErrorNote error={appts.error} />

      <Panel>
        {!h ? <Empty>The studio is closed on this day.</Empty> : (
          <div className="sched" style={{ '--cols': stylists.data?.length || 4 }}>
            <div className="sched-head">
              <span />
              {(stylists.data || []).map((s) => <span key={s.id} className="sched-name">{s.name}<small>{visible.filter((a) => a.staffId === s.id).length} booked</small></span>)}
            </div>
            <div className="sched-body" style={{ height: (closeMin - openMin) * PX_PER_MIN }}>
              <div className="sched-times">
                {ticks.map((m) => (
                  <span key={m} style={{ top: (m - openMin) * PX_PER_MIN }}>{String(m / 60).padStart(2, '0')}:00</span>
                ))}
              </div>
              {(stylists.data || []).map((s) => (
                <div key={s.id} className="sched-col">
                  {ticks.slice(0, -1).map((m) => (
                    <button key={m} type="button" className="sched-hour" style={{ top: (m - openMin) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                      aria-label={`Book ${s.name} at ${m / 60}:00`}
                      onClick={() => setBooking({ date, staffId: s.id, time: `${String(m / 60).padStart(2, '0')}:00` })} />
                  ))}
                  {visible.filter((a) => a.staffId === s.id).map((a) => {
                    const top = (toMin(a.startAt) - openMin) * PX_PER_MIN;
                    const height = Math.max(24, (toMin(a.endAt) - toMin(a.startAt)) * PX_PER_MIN - 3);
                    return (
                      <button key={a.id} type="button" className={`sched-appt st-${a.status}`} style={{ top, height }} onClick={() => setOpen(a)}>
                        <strong>{fmtTime(a.startAt)} {a.clientName}</strong>
                        <span>{a.serviceName}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {nowMin !== null && nowMin >= openMin && nowMin <= closeMin && (
                <div className="sched-now" style={{ top: (nowMin - openMin) * PX_PER_MIN }} aria-hidden="true" />
              )}
            </div>
          </div>
        )}
      </Panel>

      {open && <ApptDetail appt={open} onClose={() => setOpen(null)} onChange={replace} />}
      {booking && <NewBooking initial={{ date: booking.date, staffId: booking.staffId, time: booking.time }} onClose={() => setBooking(null)} onDone={() => { setBooking(null); appts.reload(); }} />}
    </>
  );
}
