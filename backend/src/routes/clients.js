import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '../db.js';
import { authenticate, publicUser, requireRole, stylistScope } from '../auth.js';
import { nowLocal } from '../lib/time.js';

const r = Router();
r.use(authenticate, requireRole('staff', 'admin'));

r.get('/', (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';

  // Lookup for the booking dialog: name and contact only, any client, no figures.
  if (req.query.lookup === '1') {
    return res.json(db.prepare(
      `SELECT id, name, email, phone FROM users
        WHERE role = 'client' AND (name LIKE ? OR email LIKE ? OR COALESCE(phone,'') LIKE ?) ORDER BY name LIMIT 20`,
    ).all(q, q, q));
  }

  // Stylists see only clients they have had in their chair, with figures from their own appointments.
  const sid = stylistScope(req.user);
  const join = sid ? `JOIN appointments a ON a.client_id = u.id AND a.staff_id = ${Number(sid)}` : 'LEFT JOIN appointments a ON a.client_id = u.id';
  const now = nowLocal();
  res.json(db.prepare(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at AS createdAt,
            COUNT(CASE WHEN a.status='completed' THEN 1 END) AS visits,
            COALESCE(SUM(CASE WHEN a.status='completed' THEN a.price_cents END),0) AS spentCents,
            MAX(CASE WHEN a.status='completed' THEN a.start_at END) AS lastVisit,
            MIN(CASE WHEN a.status IN ('pending','confirmed') AND a.start_at >= ? THEN a.start_at END) AS nextVisit,
            SUM(a.status='no_show') AS noShows
       FROM users u ${join}
      WHERE u.role = 'client' AND (u.name LIKE ? OR u.email LIKE ? OR COALESCE(u.phone,'') LIKE ?)
      GROUP BY u.id ORDER BY spentCents DESC`,
  ).all(now, q, q, q));
});

r.get('/:id', (req, res) => {
  const u = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'client'`).get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Client not found.' });
  const sid = stylistScope(req.user);
  if (sid && !db.prepare('SELECT 1 FROM appointments WHERE client_id = ? AND staff_id = ? LIMIT 1').get(u.id, sid)) {
    return res.status(404).json({ error: 'Client not found.' });
  }
  res.json(publicUser(u));
});

// Walk-in / phone client created by staff. A random password is set; the client can reset by registering support flow later.
r.post('/', (req, res) => {
  const { name, email, phone } = req.body || {};
  if (!name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'A client with this email already exists.' });
  }
  const info = db.prepare(
    `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'client')`,
  ).run(name.trim(), email.trim().toLowerCase(), phone?.trim() || null, bcrypt.hashSync(randomBytes(12).toString('hex'), 10));
  res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid))));
});

export default r;
