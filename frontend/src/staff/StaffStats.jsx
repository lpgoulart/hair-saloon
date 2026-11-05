import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../lib/useApi.js';
import { fmtDay, money, num, STATUS_LABEL, WEEKDAYS } from '../lib/format.js';
import { ErrorNote, PageHead, Panel, Stars, Stat } from '../components/ui.jsx';
import { AXIS, GRID, INK, TOOLTIP } from '../components/chartTheme.js';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];

const delta = (v, suffix = 'vs previous period') => {
  if (v === null || v === undefined) return { note: 'no earlier data', tone: '' };
  return { note: `${v > 0 ? '+' : ''}${v}% ${suffix}`, tone: v >= 0 ? 'up' : 'down' };
};

export default function StaffStats() {
  const [days, setDays] = useState(30);
  const o = useApi('/stats/overview', { days });
  const d = o.data;

  const series = useMemo(() => {
    if (!d) return [];
    const daily = d.daily.map((x) => ({ ...x, revenue: x.revenueCents / 100 }));
    // closed days are left out so the line doesn't dive to zero twice a week
    if (days <= 31) return daily.filter((x) => x.open).map((x) => ({ ...x, label: fmtDay(x.date, { day: 'numeric', month: 'short' }) }));
    // group by week
    const out = [];
    for (let i = 0; i < daily.length; i += 7) {
      const w = daily.slice(i, i + 7);
      out.push({ label: fmtDay(w[0].date, { day: 'numeric', month: 'short' }), revenue: w.reduce((s, x) => s + x.revenue, 0), visits: w.reduce((s, x) => s + x.visits, 0) });
    }
    return out;
  }, [d, days]);

  return (
    <>
      <PageHead
        title={d?.scope ? 'Your statistics' : 'Statistics'}
        sub={d ? `${fmtDay(d.range.from)} to ${fmtDay(d.range.to)} · ${d.scope ? 'only appointments in your chair' : 'whole studio, all stylists'}` : ''}
      >
        <div className="seg" role="radiogroup" aria-label="Period">
          {RANGES.map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={days === v} className={days === v ? 'is-on' : ''} onClick={() => setDays(v)}>{l}</button>
          ))}
        </div>
      </PageHead>
      <ErrorNote error={o.error} />
      {d && (
        <>
          <div className="stat-row">
            <Stat label="Revenue" value={money(d.kpis.revenueCents)} {...delta(d.kpis.change.revenue)} />
            <Stat label="Completed visits" value={num(d.kpis.completed)} {...delta(d.kpis.change.completed)} />
            <Stat label="Average ticket" value={money(d.kpis.avgTicketCents)} {...delta(d.kpis.change.avgTicket)} />
            <Stat label={d.scope ? 'Your chair booked' : 'Chair utilisation'} value={`${d.kpis.utilization}%`} note="booked minutes of opening hours" />
          </div>
          <div className="stat-row">
            <Stat label="Clients served" value={num(d.kpis.clients)} note={`${d.kpis.returningRate}% returning`} />
            <Stat label="New clients" value={num(d.kpis.newClients)} {...delta(d.kpis.change.newClients)} />
            <Stat label="Cancellations" value={`${d.kpis.cancelRate}%`} note={`${d.kpis.cancelled} of ${d.kpis.total} bookings`} />
            <Stat label="No-shows" value={`${d.kpis.noShowRate}%`} note={`average rating ${d.kpis.rating ?? '—'}`} />
          </div>

          <Panel title={days <= 31 ? 'Revenue per day' : 'Revenue per week'}>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="label" {...AXIS} minTickGap={24} />
                  <YAxis {...AXIS} width={56} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`} />
                  <Tooltip {...TOOLTIP} formatter={(v, n) => (n === 'revenue' ? [money(v * 100), 'Revenue'] : [v, 'Visits'])} />
                  <Area type="linear" dataKey="revenue" stroke={INK} strokeWidth={2} fill={INK} fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid-2">
            <Panel title="Services by revenue">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={Math.max(220, d.topServices.length * 30)}>
                  <BarChart layout="vertical" data={d.topServices.map((s) => ({ ...s, revenue: s.revenueCents / 100 }))} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid {...GRID} horizontal={false} vertical />
                    <XAxis type="number" {...AXIS} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`} />
                    <YAxis type="category" dataKey="name" {...AXIS} width={170} />
                    <Tooltip {...TOOLTIP} formatter={(v) => [money(v * 100), 'Revenue']} />
                    <Bar dataKey="revenue" fill={INK} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Bookings by outcome">
              <ul className="meter-list">
                {['completed', 'confirmed', 'pending', 'cancelled', 'no_show'].map((k) => {
                  const n = d.byStatus.find((x) => x.status === k)?.n || 0;
                  const p = d.kpis.total ? (n / d.kpis.total) * 100 : 0;
                  return (
                    <li key={k}>
                      <span>{STATUS_LABEL[k]}</span>
                      <span className="meter"><span style={{ width: `${p}%` }} /></span>
                      <span className="num">{n}</span>
                    </li>
                  );
                })}
              </ul>
              <h3 className="sub-title">Revenue by category</h3>
              <table className="table">
                <thead><tr><th>Category</th><th className="num">Visits</th><th className="num">Revenue</th><th className="num">Share</th></tr></thead>
                <tbody>
                  {d.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td>{c.category}</td><td className="num">{c.visits}</td><td className="num">{money(c.revenueCents)}</td>
                      <td className="num">{d.kpis.revenueCents ? Math.round((c.revenueCents / d.kpis.revenueCents) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          {d.reviews?.length > 0 && (
            <Panel title={d.scope ? 'What your clients said' : 'Latest ratings'}>
              <ul className="visit-list">
                {d.reviews.map((r) => (
                  <li key={r.startAt + r.clientName}>
                    <span className="visit-date">{fmtDay(r.startAt)}</span>
                    <span>
                      <Stars value={r.rating} /> {r.serviceName} <span className="muted">· {r.clientName}{!d.scope && <> with {r.staffName}</>}</span>
                      {r.review && <><br />&ldquo;{r.review}&rdquo;</>}
                    </span>
                    <span />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {!d.scope && <Panel title="Stylists">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Stylist</th><th className="num">Booked</th><th className="num">Completed</th><th className="num">No-shows</th><th className="num">Revenue</th><th className="num">Rating</th><th>Utilisation</th></tr></thead>
                <tbody>
                  {d.staff.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong><br /><span className="muted">{s.title}</span></td>
                      <td className="num">{s.booked}</td>
                      <td className="num">{s.completed}</td>
                      <td className="num">{s.noShow}</td>
                      <td className="num">{money(s.revenueCents)}</td>
                      <td className="num">{s.rating ?? '—'}</td>
                      <td><span className="meter-inline"><span className="meter"><span style={{ width: `${Math.min(100, s.utilization)}%` }} /></span>{s.utilization}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>}

          <Panel title={d.scope ? 'When you are busiest' : 'When the studio is busiest'}>
            <Heatmap heat={d.heat} />
          </Panel>
        </>
      )}
    </>
  );
}

function Heatmap({ heat }) {
  const daysShown = [2, 3, 4, 5, 6];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const max = Math.max(1, ...heat.map((h) => h.n));
  const get = (d, h) => heat.find((x) => x.dow === d && x.hour === h)?.n || 0;
  const peak = heat.reduce((a, b) => (b.n > (a?.n || 0) ? b : a), null);
  return (
    <>
      {peak && <p className="heat-note">Busiest hour: <strong>{WEEKDAYS[peak.dow]} at {peak.hour}:00</strong>, with {peak.n} bookings in this period.</p>}
      <div className="heat" role="table" aria-label="Bookings by weekday and hour">
        <div className="heat-row" role="row">
          <span role="columnheader" />
          {hours.map((h) => <span key={h} role="columnheader" className="heat-h">{h}</span>)}
        </div>
        {daysShown.map((d) => (
          <div className="heat-row" role="row" key={d}>
            <span role="rowheader" className="heat-d">{WEEKDAYS[d]}</span>
            {hours.map((h) => {
              const n = get(d, h);
              return <span key={h} role="cell" className="heat-cell" title={`${WEEKDAYS[d]} ${h}:00 — ${n} bookings`} style={{ '--a': n / max }}><span className="visually-hidden">{n}</span></span>;
            })}
          </div>
        ))}
      </div>
    </>
  );
}
