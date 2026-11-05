import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRole, stylistScope } from '../auth.js';
import { APPT_SELECT } from './appointments.js';
import { addDays, fmtDate, hoursFor, nowLocal, parseDate, toMin } from '../lib/time.js';
import { activeStylists } from '../lib/availability.js';

const r = Router();
r.use(authenticate, requireRole('staff', 'admin'));

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const change = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

/**
 * SQL fragment limiting appointments to one stylist.
 * A stylist (role 'staff') only ever sees their own work; the manager (role 'admin') sees the whole studio.
 * The id comes from the verified token's user row, so it is a trusted integer.
 */
const scopeSql = (sid, alias = '') => (sid ? ` AND ${alias}staff_id = ${Number(sid)}` : '');

function periodTotals(from, to, sid) {
  const S = scopeSql(sid);
  const row = db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(status = 'completed') AS completed,
            SUM(status = 'cancelled') AS cancelled,
            SUM(status = 'no_show') AS noShow,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price_cents END), 0) AS revenue,
            COUNT(DISTINCT client_id) AS clients,
            ROUND(AVG(rating), 2) AS rating
       FROM appointments WHERE start_at >= ? AND start_at <= ?${S}`,
  ).get(`${from} 00:00`, `${to} 23:59`);
  // New = first ever (non-cancelled) visit falls in the period; for a stylist, first visit with them.
  const newClients = db.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT client_id, MIN(start_at) AS first FROM appointments
       WHERE status != 'cancelled'${S} GROUP BY client_id) WHERE first >= ? AND first <= ?`,
  ).get(`${from} 00:00`, `${to} 23:59`).n;
  return {
    total: row.total, completed: row.completed || 0, cancelled: row.cancelled || 0, noShow: row.noShow || 0,
    revenueCents: row.revenue, clients: row.clients, newClients, rating: row.rating,
    avgTicketCents: row.completed ? Math.round(row.revenue / row.completed) : 0,
  };
}

/** Bookable minutes between from..to (inclusive) for `stylistCount` chairs. */
function capacityMinutes(from, to, stylistCount) {
  let mins = 0;
  for (let d = parseDate(from); fmtDate(d) <= to; d = addDays(d, 1)) {
    const h = hoursFor(fmtDate(d));
    if (h) mins += toMin(h.close) - toMin(h.open);
  }
  return mins * stylistCount;
}

r.get('/overview', (req, res) => {
  const sid = stylistScope(req.user);
  const S = scopeSql(sid);
  const SA = scopeSql(sid, 'a.');
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
  const today = new Date();
  const to = fmtDate(today);
  const from = fmtDate(addDays(today, -(days - 1)));
  const prevTo = fmtDate(addDays(today, -days));
  const prevFrom = fmtDate(addDays(today, -(2 * days - 1)));
  const range = [`${from} 00:00`, `${to} 23:59`];

  const cur = periodTotals(from, to, sid);
  const prev = periodTotals(prevFrom, prevTo, sid);

  const dailyRows = db.prepare(
    `SELECT substr(start_at,1,10) AS date,
            COALESCE(SUM(CASE WHEN status='completed' THEN price_cents END),0) AS revenue,
            SUM(status='completed') AS visits, COUNT(*) AS booked
       FROM appointments WHERE start_at >= ? AND start_at <= ?${S} GROUP BY date`,
  ).all(...range);
  const daily = [];
  for (let i = 0; i < days; i++) {
    const date = fmtDate(addDays(parseDate(from), i));
    const row = dailyRows.find((x) => x.date === date);
    daily.push({ date, open: !!hoursFor(date), revenueCents: row?.revenue || 0, visits: row?.visits || 0, booked: row?.booked || 0 });
  }

  const byStatus = db.prepare(
    `SELECT status, COUNT(*) AS n FROM appointments WHERE start_at >= ? AND start_at <= ?${S} GROUP BY status`,
  ).all(...range);

  const topServices = db.prepare(
    `SELECT s.id, s.name, s.category, COUNT(*) AS bookings,
            COALESCE(SUM(CASE WHEN a.status='completed' THEN a.price_cents END),0) AS revenueCents
       FROM appointments a JOIN services s ON s.id = a.service_id
      WHERE a.start_at >= ? AND a.start_at <= ? AND a.status != 'cancelled'${SA}
      GROUP BY s.id ORDER BY revenueCents DESC`,
  ).all(...range);

  const byCategory = db.prepare(
    `SELECT s.category, COALESCE(SUM(a.price_cents),0) AS revenueCents, COUNT(*) AS visits
       FROM appointments a JOIN services s ON s.id = a.service_id
      WHERE a.start_at >= ? AND a.start_at <= ? AND a.status = 'completed'${SA}
      GROUP BY s.category ORDER BY revenueCents DESC`,
  ).all(...range);

  const stylists = activeStylists().filter((s) => !sid || s.id === sid);
  const capPer = capacityMinutes(from, to, 1);
  const pastEnd = nowLocal() < range[1] ? nowLocal() : range[1];
  const staffRows = db.prepare(
    `SELECT staff_id AS id, COUNT(*) AS booked, SUM(status='completed') AS completed,
            SUM(status='no_show') AS noShow, SUM(status='cancelled') AS cancelled,
            COALESCE(SUM(CASE WHEN status='completed' THEN price_cents END),0) AS revenueCents,
            ROUND(AVG(rating),2) AS rating,
            COALESCE(SUM(CASE WHEN status IN ('completed','confirmed','pending')
              THEN (julianday(end_at) - julianday(start_at)) * 1440 END),0) AS busyMin
       FROM appointments WHERE start_at >= ? AND start_at <= ?${S} GROUP BY staff_id`,
  ).all(range[0], pastEnd);
  const staff = stylists.map((s) => {
    const x = staffRows.find((y) => y.id === s.id) || {};
    return {
      id: s.id, name: s.name, title: s.title,
      booked: x.booked || 0, completed: x.completed || 0, noShow: x.noShow || 0,
      revenueCents: x.revenueCents || 0, rating: x.rating ?? null,
      utilization: pct(x.busyMin || 0, capPer),
    };
  }).sort((a, b) => b.revenueCents - a.revenueCents);

  const heat = db.prepare(
    `SELECT CAST(strftime('%w', start_at) AS INTEGER) AS dow, CAST(substr(start_at,12,2) AS INTEGER) AS hour, COUNT(*) AS n
       FROM appointments WHERE start_at >= ? AND start_at <= ? AND status != 'cancelled'${S} GROUP BY dow, hour`,
  ).all(...range);

  const capacity = capacityMinutes(from, to, Math.max(1, stylists.length));
  const busy = staffRows.reduce((s, x) => s + (x.busyMin || 0), 0);

  // Returning: clients in period who had an earlier completed visit (with this stylist, when scoped).
  const returning = db.prepare(
    `SELECT COUNT(DISTINCT a.client_id) AS n FROM appointments a
      WHERE a.start_at >= ? AND a.start_at <= ? AND a.status = 'completed'${SA}
        AND EXISTS (SELECT 1 FROM appointments b WHERE b.client_id = a.client_id AND b.status='completed'
                    AND b.start_at < ?${scopeSql(sid, 'b.')})`,
  ).get(range[0], range[1], range[0]).n;

  // Recent reviews of this stylist (or the studio).
  const reviews = db.prepare(
    `SELECT a.rating, a.review, a.start_at AS startAt, s.name AS serviceName, st.name AS staffName, c.name AS clientName
       FROM appointments a JOIN services s ON s.id=a.service_id JOIN users st ON st.id=a.staff_id JOIN users c ON c.id=a.client_id
      WHERE a.rating IS NOT NULL AND a.start_at >= ? AND a.start_at <= ?${SA}
      ORDER BY a.start_at DESC LIMIT 6`,
  ).all(...range);

  res.json({
    scope: sid ? { staffId: sid, name: req.user.name } : null,
    range: { from, to, days },
    kpis: {
      ...cur,
      cancelRate: pct(cur.cancelled, cur.total),
      noShowRate: pct(cur.noShow, cur.total),
      utilization: pct(busy, capacity),
      returningRate: pct(returning, cur.clients),
      change: {
        revenue: change(cur.revenueCents, prev.revenueCents),
        completed: change(cur.completed, prev.completed),
        avgTicket: change(cur.avgTicketCents, prev.avgTicketCents),
        newClients: change(cur.newClients, prev.newClients),
      },
    },
    daily, byStatus, topServices, byCategory, staff, heat, reviews,
  });
});

r.get('/today', (req, res) => {
  const sid = stylistScope(req.user);
  const d = fmtDate(new Date());
  const rows = db.prepare(
    `${APPT_SELECT} WHERE substr(a.start_at,1,10) = ?${scopeSql(sid, 'a.')} ORDER BY a.start_at`,
  ).all(d);
  const upcoming7 = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(price_cents),0) AS value FROM appointments
      WHERE status IN ('pending','confirmed') AND start_at >= ? AND start_at <= ?${scopeSql(sid)}`,
  ).get(nowLocal(), `${fmtDate(addDays(new Date(), 7))} 23:59`);
  res.json({ date: d, scope: sid ? { staffId: sid } : null, appointments: rows, next7: { count: upcoming7.n, valueCents: upcoming7.value } });
});

export default r;
