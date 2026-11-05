import { db } from '../db.js';
import {
  SLOT_STEP_MIN, addMinutes, fmtDateTime, hoursFor, parseDateTime, toMin, addDays, fmtDate, parseDate,
} from './time.js';

const pad = (n) => String(n).padStart(2, '0');
const minToHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function activeStylists() {
  return db.prepare(
    `SELECT id, name, title, bio, photo FROM users WHERE role IN ('staff','admin') AND active = 1 AND title IS NOT NULL ORDER BY id`,
  ).all();
}

/** True when stylist has a non-cancelled appointment overlapping [start,end). */
export function hasConflict(staffId, start, end, ignoreId = 0) {
  const row = db.prepare(
    `SELECT id FROM appointments
      WHERE staff_id = ? AND id != ? AND status IN ('pending','confirmed','completed')
        AND start_at < ? AND end_at > ? LIMIT 1`,
  ).get(staffId, ignoreId, end, start);
  return !!row;
}

/** Inside opening hours? */
export function withinHours(start, durationMin) {
  const [date, time] = start.split(' ');
  const h = hoursFor(date);
  if (!h) return false;
  const s = toMin(time);
  return s >= toMin(h.open) && s + durationMin <= toMin(h.close);
}

/**
 * Free start times for one day.
 * @returns [{ staffId, staffName, slots: ['09:00', …] }]
 */
export function dayAvailability(date, durationMin, staffId = null, ignoreId = 0) {
  const h = hoursFor(date);
  const stylists = activeStylists().filter((s) => !staffId || s.id === Number(staffId));
  if (!h) return stylists.map((s) => ({ staffId: s.id, staffName: s.name, slots: [] }));

  const now = fmtDateTime(addMinutes(new Date(), 30)); // need 30 min notice
  const booked = db.prepare(
    `SELECT staff_id, start_at, end_at FROM appointments
      WHERE substr(start_at,1,10) = ? AND status IN ('pending','confirmed','completed') AND id != ?`,
  ).all(date, ignoreId);

  return stylists.map((s) => {
    const mine = booked.filter((b) => b.staff_id === s.id);
    const slots = [];
    for (let m = toMin(h.open); m + durationMin <= toMin(h.close); m += SLOT_STEP_MIN) {
      const start = `${date} ${minToHHMM(m)}`;
      const end = fmtDateTime(addMinutes(parseDateTime(start), durationMin));
      if (start < now) continue;
      if (mine.some((b) => b.start_at < end && b.end_at > start)) continue;
      slots.push(minToHHMM(m));
    }
    return { staffId: s.id, staffName: s.name, slots };
  });
}

/** Next `limit` free openings for a service, scanning forward from today. */
export function nextOpenings(durationMin, limit = 6, staffId = null) {
  const out = [];
  let d = new Date();
  for (let i = 0; i < 21 && out.length < limit; i++) {
    const date = fmtDate(addDays(d, i));
    const day = dayAvailability(date, durationMin, staffId);
    const merged = [];
    for (const s of day) for (const t of s.slots) merged.push({ date, time: t, staffId: s.staffId, staffName: s.staffName });
    merged.sort((a, b) => a.time.localeCompare(b.time));
    const seen = new Set();
    for (const m of merged) {
      if (seen.has(m.time)) continue; // one stylist per time is enough for the teaser
      seen.add(m.time);
      out.push(m);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export { parseDate };
