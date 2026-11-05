// Demo data. Run `npm run seed` to wipe and reseed; the server also seeds an empty database on start.
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { db, tx } from './db.js';
import { HOURS, addDays, addMinutes, fmtDate, fmtDateTime, parseDateTime, toMin } from './lib/time.js';

export const DEMO_PASSWORD = 'onda1234';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SERVICES = [
  ['Signature cut and finish', 'Cut & style', 'Consultation, wash, precision cut and a finish that you can recreate at home.', 60, 6500],
  ['Short cut and clipper work', 'Cut & style', 'Tapered or textured short cuts with scissor-over-comb and clipper detail.', 45, 4500],
  ['Fringe tidy', 'Cut & style', 'A quick reshape of the fringe between full cuts.', 15, 1500],
  ['Blow-dry and set waves', 'Cut & style', 'Smooth blow-dry or a classic set: finger waves, pin curls, soft volume.', 60, 5500],
  ['Root touch-up', 'Colour', 'Permanent colour on regrowth up to 3 cm, with a gloss on the lengths.', 90, 8500],
  ['Full colour', 'Colour', 'Single-process colour from root to tip, toned and finished.', 120, 12000],
  ['Balayage', 'Colour', 'Hand-painted lightening for a soft grown-out effect, toner and finish included.', 180, 22000],
  ['Gloss and tone', 'Colour', 'Refreshes faded colour, neutralises brass and adds shine.', 45, 6000],
  ['Deep repair mask', 'Treatment', 'Bond-building mask with a scalp massage, added to any visit or on its own.', 30, 4500],
  ['Scalp ritual', 'Treatment', 'Exfoliation, steam and a long massage for the scalp, then a blow-dry.', 60, 7000],
  ['Keratin smoothing', 'Treatment', 'Reduces frizz and drying time for up to four months.', 180, 26000],
  ['Bridal updo', 'Occasion', 'Trial and wedding-day styling, with pins and accessories fitted.', 120, 18000],
  ['Event styling', 'Occasion', 'An updo, braid or set for a party, gala or photoshoot.', 90, 9500],
];

const STYLISTS = [
  ['Marina Costa', 'marina@onda.studio', 'Creative director', 'Fifteen years of colour work; balayage and lived-in blondes are her daily language.'],
  ['Theo Laurent', 'theo@onda.studio', 'Senior stylist', 'Precision cuts, bobs and the classic set. Trained in Paris, still sets waves by hand.'],
  ['Ayo Mensah', 'ayo@onda.studio', 'Texture specialist', 'Curls, coils and protective styles. Cuts curly hair dry, one curl at a time.'],
  ['Lucia Ferreira', 'lucia@onda.studio', 'Colourist', 'Glosses, corrective colour and greys blended rather than covered.'],
];

const FIRST = ['Sofia', 'Ana', 'Beatriz', 'Clara', 'Daniela', 'Elena', 'Fernanda', 'Gabriela', 'Helena', 'Isabel', 'Julia', 'Laura', 'Mariana', 'Natalia', 'Olivia', 'Paula', 'Renata', 'Sara', 'Tania', 'Valentina', 'Yasmin', 'Lucas', 'Mateus', 'Pedro', 'Rafael', 'Gustavo', 'Bruno', 'Diego', 'Felipe', 'Andre', 'Camila', 'Leticia', 'Bianca', 'Carolina', 'Amanda', 'Rita', 'Joana', 'Marta', 'Nina', 'Lara'];
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Farias', 'Gomes', 'Henriques', 'Lima', 'Machado', 'Nunes', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Moura', 'Rocha', 'Campos', 'Pinto', 'Reis', 'Sousa'];

const REVIEWS = [
  'Exactly the cut I described, and it grows out well.',
  'Colour came out softer than I expected, in a good way.',
  'On time, unhurried, and the scalp massage is worth the visit alone.',
  'Finally someone who knows how to cut curls.',
  'Booked online in a minute, reminder arrived the day before.',
  'The gloss brought my colour back to life.',
  'Great advice on how to style it at home.',
  'Waves held all evening through dancing.',
  'Fixed a bad colour from another salon in one visit.',
  'Calm studio, good coffee, honest prices.',
];

export function seed({ days = 150, ahead = 21, clients = 320 } = {}) {
  const rand = mulberry32(20261104);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  tx(() => {
    db.exec('DELETE FROM appointments; DELETE FROM services; DELETE FROM users; DELETE FROM sqlite_sequence;');

    const insService = db.prepare('INSERT INTO services (name, category, description, duration_min, price_cents) VALUES (?, ?, ?, ?, ?)');
    const services = SERVICES.map((s) => ({ id: Number(insService.run(...s).lastInsertRowid), duration: s[3], price: s[4], name: s[0] }));

    const insUser = db.prepare(
      'INSERT INTO users (name, email, phone, password_hash, role, title, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const start = addDays(new Date(), -days);
    const startStr = fmtDateTime(addDays(start, -30));

    insUser.run('Rafa Moreno', 'admin@onda.studio', '+1 555 0100', hash, 'admin', null, 'Studio manager and front desk.', startStr);
    const stylists = STYLISTS.map(([name, email, title, bio], i) =>
      Number(insUser.run(name, email, `+1 555 01${10 + i}`, hash, 'staff', title, bio, startStr).lastInsertRowid));

    const clientIds = [];
    const demoClient = Number(insUser.run('Sofia Almeida', 'client@onda.studio', '+1 555 0199', hash, 'client', null, null, startStr).lastInsertRowid);
    clientIds.push(demoClient);
    const used = new Set(['sofia.almeida']);
    while (clientIds.length < clients) {
      const f = pick(FIRST); const l = pick(LAST);
      const key = `${f}.${l}`.toLowerCase();
      if (used.has(key)) continue;
      used.add(key);
      const joined = fmtDateTime(addDays(start, Math.floor(rand() * days) - 20));
      clientIds.push(Number(insUser.run(`${f} ${l}`, `${key}@example.com`, `+1 555 ${String(1000 + clientIds.length).slice(-4)}`, hash, 'client', null, null, joined).lastInsertRowid));
    }

    // Stylist leanings: which services each one tends to do.
    const leaning = [
      [4, 5, 6, 7, 0],      // Marina: colour
      [0, 1, 2, 3, 12, 11], // Theo: cuts, sets, occasions
      [0, 9, 8, 10, 3],     // Ayo: texture, treatment
      [7, 4, 5, 6, 8],      // Lucia: colour
    ];

    const insAppt = db.prepare(
      `INSERT INTO appointments (client_id, staff_id, service_id, start_at, end_at, status, price_cents, rating, review, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = fmtDateTime(new Date());
    const total = days + ahead;

    for (let i = 0; i <= total; i++) {
      const day = addDays(start, i);
      const date = fmtDate(day);
      const h = HOURS[day.getDay()];
      if (!h) continue;
      const progress = i / days; // business grows over time
      const future = date > now.slice(0, 10);
      const daysAhead = i - days;
      const fill = future ? Math.max(0.08, 0.55 - daysAhead * 0.025) : 0.38 + 0.2 * Math.min(progress, 1) + (day.getDay() >= 5 ? 0.12 : 0);

      stylists.forEach((staffId, si) => {
        let cursor = toMin(h.open);
        const close = toMin(h.close);
        while (cursor < close) {
          if (rand() > fill) { cursor += 30; continue; }
          const svc = services[rand() < 0.7 ? pick(leaning[si]) : Math.floor(rand() * services.length)];
          if (cursor + svc.duration > close) { cursor += 30; continue; }
          const s = parseDateTime(`${date} 00:00`);
          const startAt = fmtDateTime(addMinutes(s, cursor));
          const endAt = fmtDateTime(addMinutes(s, cursor + svc.duration));
          const client = rand() < 0.012 ? demoClient : clientIds[1 + Math.floor(Math.pow(rand(), 1.1) * Math.max(20, Math.floor((clientIds.length - 1) * Math.min(1, 0.3 + 0.7 * progress))))];
          let status = 'confirmed';
          let rating = null;
          let review = null;
          if (startAt < now) {
            const x = rand();
            status = x < 0.86 ? 'completed' : x < 0.95 ? 'cancelled' : 'no_show';
            if (status === 'completed' && rand() < 0.55) {
              rating = rand() < 0.72 ? 5 : rand() < 0.8 ? 4 : 3;
              if (rand() < 0.3) review = pick(REVIEWS);
            }
          } else if (rand() < 0.1) status = 'pending';
          const created = fmtDateTime(addDays(s, -Math.floor(1 + rand() * 20)));
          insAppt.run(client, staffId, svc.id, startAt, endAt, status, svc.price, rating, review, created);
          cursor += svc.duration + (rand() < 0.3 ? 30 : 0);
        }
      });
    }

    // Make sure the demo client has a good history and one upcoming visit.
    const sofiaUpcoming = db.prepare(
      `SELECT COUNT(*) AS n FROM appointments WHERE client_id = ? AND status IN ('pending','confirmed') AND start_at >= ?`,
    ).get(demoClient, now).n;
    if (!sofiaUpcoming) {
      const fut = db.prepare(
        `SELECT id FROM appointments WHERE status = 'confirmed' AND start_at >= ? ORDER BY start_at LIMIT 1 OFFSET 12`,
      ).get(now);
      if (fut) db.prepare('UPDATE appointments SET client_id = ? WHERE id = ?').run(demoClient, fut.id);
    }
  });

  const n = db.prepare('SELECT COUNT(*) AS n FROM appointments').get().n;
  console.log(`Seeded ${SERVICES.length} services, ${STYLISTS.length} stylists, ${clients} clients, ${n} appointments.`);
  console.log(`Demo logins (password "${DEMO_PASSWORD}"): client@onda.studio · marina@onda.studio · admin@onda.studio`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) seed();
