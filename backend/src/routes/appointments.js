import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, isStaff, stylistScope } from '../auth.js';
import { hasConflict, withinHours } from '../lib/availability.js';
import { addMinutes, fmtDateTime, isValidDate, isValidTime, nowLocal, parseDateTime } from '../lib/time.js';

const r = Router();
r.use(authenticate);

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

export const APPT_SELECT = `
  SELECT a.id, a.start_at AS startAt, a.end_at AS endAt, a.status, a.price_cents AS priceCents,
         a.notes, a.staff_notes AS staffNotes, a.rating, a.review, a.created_at AS createdAt,
         s.id AS serviceId, s.name AS serviceName, s.category, s.duration_min AS durationMin,
         st.id AS staffId, st.name AS staffName, st.photo AS staffPhoto,
         c.id AS clientId, c.name AS clientName, c.email AS clientEmail, c.phone AS clientPhone
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN users st   ON st.id = a.staff_id
    JOIN users c    ON c.id = a.client_id`;

const getAppt = (id) => db.prepare(`${APPT_SELECT} WHERE a.id = ?`).get(id);

/** Manager: everything. Stylist: only appointments in their own chair. Client: only their own. */
function canSee(user, appt) {
  if (user.role === 'admin') return true;
  if (user.role === 'staff') return appt.staffId === user.id;
  return appt.clientId === user.id;
}

/** Validate a (date, time, staff, service) request; returns { start, end, service } or { error }. */
function validateSlot({ date, time, staffId, serviceId }, ignoreId = 0) {
  if (!isValidDate(date) || !isValidTime(time)) return { error: 'Choose a valid date and time.' };
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) return { error: 'That service is not available.' };
  const stylist = db.prepare(`SELECT id FROM users WHERE id = ? AND role IN ('staff','admin') AND active = 1`).get(staffId);
  if (!stylist) return { error: 'That stylist is not available.' };
  const start = `${date} ${time}`;
  const end = fmtDateTime(addMinutes(parseDateTime(start), service.duration_min));
  if (start < nowLocal()) return { error: 'That time has already passed.' };
  if (!withinHours(start, service.duration_min)) return { error: 'The studio is closed at that time.' };
  if (hasConflict(stylist.id, start, end, ignoreId)) return { error: 'That time was just taken. Please pick another.' };
  return { start, end, service };
}

// List. Clients see their own; staff can filter everything.
r.get('/', (req, res) => {
  const { from, to, status, staffId, clientId, q } = req.query;
  const where = [];
  const args = [];
  if (!isStaff(req.user)) {
    where.push('a.client_id = ?'); args.push(req.user.id);
  } else if (clientId) {
    where.push('a.client_id = ?'); args.push(Number(clientId));
  }
  if (from) { where.push('a.start_at >= ?'); args.push(`${from} 00:00`); }
  if (to) { where.push('a.start_at <= ?'); args.push(`${to} 23:59`); }
  if (status) {
    const list = String(status).split(',').filter((s) => STATUSES.includes(s));
    if (list.length) { where.push(`a.status IN (${list.map(() => '?').join(',')})`); args.push(...list); }
  }
  const sid = stylistScope(req.user);
  if (sid) { where.push('a.staff_id = ?'); args.push(sid); }
  else if (staffId) { where.push('a.staff_id = ?'); args.push(Number(staffId)); }
  if (q) {
    where.push('(c.name LIKE ? OR c.email LIKE ? OR s.name LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const rows = db.prepare(
    `${APPT_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.start_at ${order} LIMIT ${limit}`,
  ).all(...args);
  res.json(rows);
});

r.get('/:id', (req, res) => {
  const a = getAppt(Number(req.params.id));
  if (!a || !canSee(req.user, a)) return res.status(404).json({ error: 'Appointment not found.' });
  res.json(a);
});

// Book. Clients book for themselves; staff pass clientId.
r.post('/', (req, res) => {
  const { date, time, staffId, serviceId, notes } = req.body || {};
  let clientId = req.user.id;
  if (isStaff(req.user)) {
    clientId = Number(req.body.clientId);
    const c = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'client'`).get(clientId);
    if (!c) return res.status(400).json({ error: 'Choose a client for this booking.' });
    if (stylistScope(req.user) && Number(staffId) !== req.user.id) {
      return res.status(403).json({ error: 'You can only book clients into your own chair.' });
    }
  }
  const v = validateSlot({ date, time, staffId, serviceId });
  if (v.error) return res.status(409).json({ error: v.error });
  const info = db.prepare(
    `INSERT INTO appointments (client_id, staff_id, service_id, start_at, end_at, status, price_cents, notes)
     VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
  ).run(clientId, Number(staffId), v.service.id, v.start, v.end, v.service.price_cents, notes?.slice(0, 500) || null);
  res.status(201).json(getAppt(Number(info.lastInsertRowid)));
});

// Reschedule (client for own upcoming, or staff).
r.post('/:id/reschedule', (req, res) => {
  const a = getAppt(Number(req.params.id));
  if (!a || !canSee(req.user, a)) return res.status(404).json({ error: 'Appointment not found.' });
  if (!['pending', 'confirmed'].includes(a.status)) return res.status(400).json({ error: 'Only upcoming appointments can be moved.' });
  if (!isStaff(req.user) && a.startAt < nowLocal()) return res.status(400).json({ error: 'This appointment has already started.' });
  const { date, time } = req.body || {};
  const staffId = req.body.staffId || a.staffId;
  if (stylistScope(req.user) && Number(staffId) !== req.user.id) {
    return res.status(403).json({ error: 'Ask the manager to move a client to another stylist.' });
  }
  const v = validateSlot({ date, time, staffId, serviceId: a.serviceId }, a.id);
  if (v.error) return res.status(409).json({ error: v.error });
  db.prepare(
    `UPDATE appointments SET start_at = ?, end_at = ?, staff_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
  ).run(v.start, v.end, Number(staffId), a.id);
  res.json(getAppt(a.id));
});

r.post('/:id/cancel', (req, res) => {
  const a = getAppt(Number(req.params.id));
  if (!a || !canSee(req.user, a)) return res.status(404).json({ error: 'Appointment not found.' });
  if (!['pending', 'confirmed'].includes(a.status)) return res.status(400).json({ error: 'This appointment cannot be cancelled.' });
  if (!isStaff(req.user) && a.startAt < nowLocal()) return res.status(400).json({ error: 'This appointment has already started.' });
  db.prepare(`UPDATE appointments SET status = 'cancelled', updated_at = datetime('now','localtime') WHERE id = ?`).run(a.id);
  res.json(getAppt(a.id));
});

// Client review after a completed visit.
r.post('/:id/review', (req, res) => {
  const a = getAppt(Number(req.params.id));
  if (!a || a.clientId !== req.user.id) return res.status(404).json({ error: 'Appointment not found.' });
  if (a.status !== 'completed') return res.status(400).json({ error: 'You can rate a visit once it is completed.' });
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be 1 to 5.' });
  db.prepare('UPDATE appointments SET rating = ?, review = ? WHERE id = ?')
    .run(rating, String(req.body.review || '').slice(0, 1000) || null, a.id);
  res.json(getAppt(a.id));
});

// Staff update: status, notes, price.
r.patch('/:id', (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: 'You do not have access to this.' });
  const a = getAppt(Number(req.params.id));
  if (!a || !canSee(req.user, a)) return res.status(404).json({ error: 'Appointment not found.' });
  const { status, staffNotes, priceCents } = req.body || {};
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  db.prepare(
    `UPDATE appointments SET status = COALESCE(?, status), staff_notes = COALESCE(?, staff_notes),
       price_cents = COALESCE(?, price_cents), updated_at = datetime('now','localtime') WHERE id = ?`,
  ).run(status ?? null, staffNotes ?? null, Number.isFinite(priceCents) ? priceCents : null, a.id);
  res.json(getAppt(a.id));
});

export default r;
