export const CURRENCY = 'USD';
export const LOCALE = 'en-US';

const money0 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

export const money = (cents, exact = false) => (exact ? money2 : money0).format((cents || 0) / 100);
export const num = (n) => new Intl.NumberFormat(LOCALE).format(n || 0);

const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateStr(new Date());
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return toDateStr(new Date(y, m - 1, d + n)); };
export const parseLocal = (s) => {
  const [date, time = '00:00'] = s.replace('T', ' ').split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
};

export const fmtDay = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseLocal(s).toLocaleDateString(LOCALE, opts);
export const fmtLongDay = (s) => fmtDay(s, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtTime = (s) => s.slice(11, 16);
export const fmtDuration = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}`);

export function relativeDay(s) {
  const diff = Math.round((parseLocal(s.slice(0, 10)) - parseLocal(today())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return fmtDay(s);
}

export const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
