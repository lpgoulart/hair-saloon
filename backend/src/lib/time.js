// Salon-local time helpers. Times are stored as 'YYYY-MM-DD HH:MM' strings.

export const HOURS = {
  // 0 = Sunday … 6 = Saturday. null = closed.
  0: null,
  1: null,
  2: { open: '09:00', close: '19:00' },
  3: { open: '09:00', close: '19:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:00', close: '20:00' },
  6: { open: '08:00', close: '17:00' },
};
export const SLOT_STEP_MIN = 30;

const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseDateTime(s) {
  const [date, time = '00:00'] = s.trim().replace('T', ' ').split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addMinutes(d, min) {
  return new Date(d.getTime() + min * 60000);
}
export function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const nowLocal = () => fmtDateTime(new Date());
export const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(parseDate(s));
export const isValidTime = (s) => /^\d{2}:\d{2}$/.test(s || '');

export function hoursFor(dateStr) {
  return HOURS[parseDate(dateStr).getDay()];
}
