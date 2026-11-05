import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRole } from '../auth.js';
import { activeStylists, dayAvailability, nextOpenings } from '../lib/availability.js';
import { HOURS, isValidDate } from '../lib/time.js';

const r = Router();

const SERVICE_COLS = `id, name, category, description, duration_min AS durationMin, price_cents AS priceCents, active`;

// ---- Public ----
r.get('/services', (req, res) => {
  const all = req.query.all === '1';
  res.json(db.prepare(`SELECT ${SERVICE_COLS} FROM services ${all ? '' : 'WHERE active = 1'} ORDER BY category, price_cents`).all());
});

r.get('/stylists', (_req, res) => {
  const ratings = db.prepare(
    `SELECT staff_id, ROUND(AVG(rating),2) AS avg, COUNT(rating) AS n FROM appointments WHERE rating IS NOT NULL GROUP BY staff_id`,
  ).all();
  res.json(activeStylists().map((s) => {
    const r0 = ratings.find((x) => x.staff_id === s.id);
    return { ...s, rating: r0?.avg ?? null, reviews: r0?.n ?? 0 };
  }));
});

r.get('/hours', (_req, res) => res.json(HOURS));

r.get('/availability', (req, res) => {
  const { date, serviceId, staffId, ignoreId } = req.query;
  if (!isValidDate(date)) return res.status(400).json({ error: 'Choose a valid date.' });
  const service = db.prepare('SELECT duration_min FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) return res.status(400).json({ error: 'Choose a service.' });
  res.json(dayAvailability(date, service.duration_min, staffId || null, Number(ignoreId) || 0));
});

r.get('/openings', (req, res) => {
  const service = db.prepare('SELECT duration_min FROM services WHERE id = ? AND active = 1').get(req.query.serviceId);
  if (!service) return res.status(400).json({ error: 'Choose a service.' });
  res.json(nextOpenings(service.duration_min, Math.min(Number(req.query.limit) || 6, 20), req.query.staffId || null));
});

// Recent public reviews (only real ones from completed visits).
r.get('/reviews', (_req, res) => {
  res.json(db.prepare(
    `SELECT a.rating, a.review, substr(a.start_at,1,10) AS date, s.name AS serviceName, st.name AS staffName,
            substr(c.name, 1, instr(c.name || ' ', ' ') - 1) AS clientFirstName
       FROM appointments a JOIN services s ON s.id = a.service_id JOIN users st ON st.id = a.staff_id JOIN users c ON c.id = a.client_id
      WHERE a.review IS NOT NULL AND a.rating >= 4 ORDER BY a.start_at DESC LIMIT 6`,
  ).all());
});

// ---- Manager: service management (prices are a studio decision) ----
const staffOnly = [authenticate, requireRole('admin')];

function validService(b) {
  if (!b.name?.trim() || !b.category?.trim()) return 'Name and category are required.';
  if (!(Number(b.durationMin) >= 15 && Number(b.durationMin) <= 480)) return 'Duration must be 15 to 480 minutes.';
  if (!(Number(b.priceCents) >= 0)) return 'Price must be zero or more.';
  return null;
}

r.post('/services', ...staffOnly, (req, res) => {
  const err = validService(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const b = req.body;
  const info = db.prepare(
    `INSERT INTO services (name, category, description, duration_min, price_cents, active) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(b.name.trim(), b.category.trim(), b.description || '', Number(b.durationMin), Math.round(Number(b.priceCents)), b.active === false ? 0 : 1);
  res.status(201).json(db.prepare(`SELECT ${SERVICE_COLS} FROM services WHERE id = ?`).get(Number(info.lastInsertRowid)));
});

r.put('/services/:id', ...staffOnly, (req, res) => {
  const err = validService(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const b = req.body;
  const info = db.prepare(
    `UPDATE services SET name = ?, category = ?, description = ?, duration_min = ?, price_cents = ?, active = ? WHERE id = ?`,
  ).run(b.name.trim(), b.category.trim(), b.description || '', Number(b.durationMin), Math.round(Number(b.priceCents)), b.active === false ? 0 : 1, Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Service not found.' });
  res.json(db.prepare(`SELECT ${SERVICE_COLS} FROM services WHERE id = ?`).get(Number(req.params.id)));
});

export default r;
