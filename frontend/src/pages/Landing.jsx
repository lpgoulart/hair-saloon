import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { fmtDuration, money, relativeDay } from '../lib/format.js';
import '../styles/landing.css';

// Public files live under the site's base path (/ locally, /hair-saloon/ on GitHub Pages).
const BASE = import.meta.env.BASE_URL;
const IMG = {
  room: `${BASE}assets/salon-de-coiffure-le-temps-d-une.jpg`,
  chairs: `${BASE}assets/salon-de-coiffure-le-temps-d-une-2.jpg`,
  dyes: `${BASE}assets/shelve-with-various-hair-colours-hair-dyes.jpg`,
  tools: `${BASE}assets/leather-belt-bag-with-various-tools-of.jpg`,
  braiding: `${BASE}assets/a-hairdresser-at-work-in-ivory-coast.jpg`,
  wave1: `${BASE}assets/portrait-of-a-woman-showing-hairstyle-done.jpg`,
  wave2: `${BASE}assets/portrait-of-a-woman-showing-hairstyle-done-2.jpg`,
  print: `${BASE}assets/woman-arranging-her-hair.jpg`,
};

const FALLBACK_SERVICES = [
  { id: 1, name: 'Signature cut and finish', category: 'Cut & style', durationMin: 60, priceCents: 6500 },
  { id: 5, name: 'Root touch-up', category: 'Colour', durationMin: 90, priceCents: 8500 },
  { id: 7, name: 'Balayage', category: 'Colour', durationMin: 180, priceCents: 22000 },
  { id: 10, name: 'Scalp ritual', category: 'Treatment', durationMin: 60, priceCents: 7000 },
];

const FAQ = [
  ['How far ahead can I book?', 'Up to three weeks. New openings appear every morning, and cancellations go straight back into the book, so the next free chair above is always current.'],
  ['Can I change or cancel?', 'Yes, from your account, any time before the appointment starts. Moving it keeps your stylist unless you pick another.'],
  ['Do I need a consultation for colour?', 'Not a separate one. Every colour visit opens with ten minutes at the mirror, included in the time shown.'],
  ['Do you cut curly and coily hair?', 'Every day. Ayo cuts curls dry, one at a time, and books a longer slot so nobody is rushed.'],
  ['What do the prices include?', 'Wash, the service itself and a finish. Toners and masks are listed separately so you only pay for what you choose.'],
  ['What if I am running late?', 'Call the studio. Within fifteen minutes we keep the full service; later than that we shorten the finish rather than the cut.'],
];

const HOURS = [
  ['Tuesday and Wednesday', '9:00 to 19:00'],
  ['Thursday and Friday', '9:00 to 20:00'],
  ['Saturday', '8:00 to 17:00'],
  ['Sunday and Monday', 'Closed'],
];

/**
 * One scroll loop for the page:
 * - writes scroll progress of each [data-progress] element (0..1) into --p
 * - adds .is-in to every [data-reveal] element once its top enters the lower 90% of the screen
 *   (anything already scrolled past is revealed too, so content can never stay hidden)
 * - shows the compact bar after the hero
 */
function useScrollProgress(root) {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('motion-ready');
    const els = [...root.current.querySelectorAll('[data-progress]')];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      root.current.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.9) el.classList.add('is-in');
      });
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const travel = Math.max(1, r.height - vh);
        const p = Math.min(1, Math.max(0, -r.top / travel));
        el.style.setProperty('--p', p.toFixed(4));
      }
      const header = root.current.querySelector('.l-bar');
      if (header) header.classList.toggle('is-shown', window.scrollY > vh * 0.9);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    // content that arrives later (services, stylists from the API) gets checked too
    const mo = new MutationObserver(onScroll);
    mo.observe(root.current, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      mo.disconnect();
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf);
      html.classList.remove('motion-ready');
    };
  }, [root]);
}

export default function Landing() {
  const root = useRef(null);
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [stylists, setStylists] = useState([]);
  useScrollProgress(root);

  useEffect(() => {
    api('/services').then(setServices).catch(() => setServices(FALLBACK_SERVICES));
    api('/stylists').then(setStylists).catch(() => setStylists([]));
  }, []);

  const accountLink = user ? homeFor(user) : '/login';
  const accountLabel = user ? 'Your account' : 'Sign in';

  return (
    <div className="landing" ref={root}>
      <a className="skip" href="#services">Skip to services</a>

      <header className="l-bar" aria-label="Site">
        <Link to="/" className="l-bar-mark display">Onda</Link>
        <nav className="l-bar-links" aria-label="Sections">
          <a href="#services">Services</a>
          <a href="#stylists">Stylists</a>
          <a href="#questions">Questions</a>
          <Link to={accountLink}>{accountLabel}</Link>
        </nav>
        <Link to="/account/book" className="btn small">Book</Link>
      </header>

      <Hero accountLink={accountLink} accountLabel={accountLabel} />
      <Intro />
      <Services services={services} />
      <Waves />
      <Stylists stylists={stylists} />
      <Steps />
      <Questions />
      <BookBand />
      <Footer accountLink={accountLink} />
    </div>
  );
}

function Hero({ accountLink, accountLabel }) {
  return (
    <section className="hero" data-progress aria-labelledby="hero-title">
      <div className="hero-sticky">
        <img className="hero-photo" src={IMG.room} alt="A small salon with two oval mirrors, styling chairs and a slatted wooden reception desk" width="1920" height="1440" fetchpriority="high" />
        <div className="hero-card">
          <h1 id="hero-title" className="hero-title display">
            <span>Onda</span><span>Hair</span><span>Studio</span>
          </h1>
          <div className="hero-facts">
            <p className="hero-lines">
              Tuesday to Saturday<br />48 Harbour Lane<br />By appointment
            </p>
            <p className="hero-sentence">
              Cuts, colour and treatments by four stylists, booked straight into the studio&rsquo;s own appointment book.
            </p>
          </div>
          <div className="hero-foot">
            <a href="#services" className="hero-link">See prices</a>
            <Link to="/account/book" className="btn">Book a chair</Link>
            <Link to={accountLink} className="hero-link">{accountLabel}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <div className="intro-pin">
        <h2 id="intro-title" className="visually-hidden">About the studio</h2>
        <p className="intro-sentence" data-reveal>
          Onda means wave. We cut, colour and set hair so it moves the way yours already wants to.
        </p>
      </div>
      <figure className="intro-photo intro-photo-a" data-reveal>
        <img src={IMG.dyes} alt="Shelves of hair colour tubes sorted by shade" width="1920" height="1465" loading="lazy" />
        <figcaption>Colour, mixed to the gram for every client</figcaption>
      </figure>
      <figure className="intro-photo intro-photo-b" data-reveal>
        <img src={IMG.braiding} alt="A hairdresser braiding a client's hair" width="1920" height="1282" loading="lazy" />
        <figcaption>Braids and protective styles, by the hour</figcaption>
      </figure>
      <figure className="intro-photo intro-photo-c" data-reveal>
        <img src={IMG.tools} alt="A leather tool belt holding scissors, combs and clips" width="1920" height="2560" loading="lazy" />
        <figcaption>Every tool within reach of the chair</figcaption>
      </figure>
    </section>
  );
}

function Services({ services }) {
  const [open, setOpen] = useState(null);
  const grouped = useMemo(() => {
    const g = new Map();
    (services || []).forEach((s) => { if (!g.has(s.category)) g.set(s.category, []); g.get(s.category).push(s); });
    return [...g.entries()];
  }, [services]);

  return (
    <section className="services" id="services" aria-labelledby="services-title">
      <div className="services-head">
        <h2 id="services-title" className="section-title display" data-reveal>Services and prices</h2>
        <p className="services-note" data-reveal style={{ '--i': 1 }}>
          Pick any service to see the next free chairs, live from the appointment book.
        </p>
      </div>
      {!services && <p className="services-loading">Loading the price list…</p>}
      {grouped.map(([cat, list]) => (
        <div className="svc-group" key={cat}>
          <h3 className="svc-cat">{cat}</h3>
          <ul className="svc-list">
            {list.map((s) => (
              <li key={s.id} className={open === s.id ? 'svc is-open' : 'svc'}>
                <button type="button" className="svc-row" aria-expanded={open === s.id} aria-controls={`open-${s.id}`}
                  onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span className="svc-name">{s.name}</span>
                  <span className="svc-dur">{fmtDuration(s.durationMin)}</span>
                  <span className="svc-price">{money(s.priceCents)}</span>
                  <span className="svc-act" aria-hidden="true">{open === s.id ? 'Close' : 'Find a time'}</span>
                </button>
                {open === s.id && <Openings service={s} id={`open-${s.id}`} />}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Openings({ service, id }) {
  const [state, setState] = useState({ loading: true, list: [], error: null });
  useEffect(() => {
    let live = true;
    api('/openings', { query: { serviceId: service.id, limit: 6 } })
      .then((list) => live && setState({ loading: false, list, error: null }))
      .catch((e) => live && setState({ loading: false, list: [], error: e.message }));
    return () => { live = false; };
  }, [service.id]);

  return (
    <div className="openings" id={id}>
      {service.description && <p className="openings-desc">{service.description}</p>}
      {state.loading && <p className="openings-status">Checking the book…</p>}
      {state.error && (
        <p className="openings-status">
          The live book is offline right now. <Link to={`/account/book?service=${service.id}`}>Choose a time on the booking page</Link>.
        </p>
      )}
      {!state.loading && !state.error && (
        state.list.length ? (
          <ul className="openings-list" aria-label={`Next free times for ${service.name}`}>
            {state.list.map((o) => (
              <li key={`${o.date}-${o.time}-${o.staffId}`}>
                <Link className="opening" to={`/account/book?service=${service.id}&date=${o.date}&time=${o.time}&staff=${o.staffId}`}>
                  <span className="opening-day">{relativeDay(`${o.date} ${o.time}`)}</span>
                  <span className="opening-time">{o.time}</span>
                  <span className="opening-who">with {o.staffName.split(' ')[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="openings-status">No free chair in the next three weeks for this one. Call us and we will find a gap.</p>
      )}
    </div>
  );
}

function Waves() {
  const items = [
    { src: IMG.wave1, alt: 'Black and white profile portrait of a woman with a finger-waved bob', cap: 'Finger waves, Adelaide, around 1930', w: 1920, h: 2560 },
    { src: IMG.print, alt: 'Japanese woodblock print of a woman arranging her long hair', cap: 'Woman arranging her hair, Kyosen, 1765', w: 1896, h: 3108 },
    { src: IMG.wave2, alt: 'Black and white portrait of a woman with a set, waved hairstyle', cap: 'A set that held all evening, around 1930', w: 1920, h: 2560 },
  ];
  return (
    <section className="waves" aria-labelledby="waves-title">
      <div className="waves-pin">
        <h2 id="waves-title" className="waves-title display">Set in waves</h2>
      </div>
      <div className="waves-run">
        {items.map((it, i) => (
          <figure key={it.src} className={`wave wave-${i}`} data-reveal>
            <img src={it.src} alt={it.alt} width={it.w} height={it.h} loading="lazy" />
            <figcaption>{it.cap}</figcaption>
          </figure>
        ))}
      </div>
      <p className="waves-text" data-reveal>
        The studio is named for the oldest trick in the trade: water, a comb and patience. Theo still sets finger waves by hand,
        and every cut here is shaped to the wave your hair already has.
      </p>
    </section>
  );
}

function Stylists({ stylists }) {
  return (
    <section className="team" id="stylists" aria-labelledby="team-title">
      <h2 id="team-title" className="section-title display" data-reveal>Four stylists</h2>
      <ul className="team-list">
        {(stylists.length ? stylists : [{ id: 0, name: 'Loading stylists', title: '', bio: '' }]).map((s, i) => (
          <li key={s.id} className="member" data-reveal style={{ '--i': i % 2 }}>
            <p className="member-name display">{s.name}</p>
            <div className="member-body">
              <p className="member-role">
                {s.title}
                {s.rating ? <> &middot; rated {s.rating.toFixed(1)} from {s.reviews} visits</> : null}
                {s.id ? <> &middot; <Link className="member-link" to={`/account/book?staff=${s.id}`}>Book with {s.name.split(' ')[0]}</Link></> : null}
              </p>
              <p>{s.bio}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Steps() {
  const steps = [
    { verb: 'Choose', img: IMG.chairs, alt: 'Two styling chairs in front of oval mirrors', text: 'Pick a service and a stylist, or take the next free chair. The book shows real times only.' },
    { verb: 'Sit', img: IMG.braiding, alt: 'A stylist working on a client', text: 'Ten minutes at the mirror first. Then the cut, colour or treatment, with nobody watching the clock.' },
    { verb: 'Return', img: IMG.room, alt: 'The salon reception desk', text: 'Your account remembers every visit, the shade we used and when you are due again.' },
  ];
  return (
    <section className="steps" aria-labelledby="steps-title">
      <h2 id="steps-title" className="visually-hidden">How a visit works</h2>
      {steps.map((s) => (
        <div className="step" key={s.verb}>
          <img className="step-photo" src={s.img} alt={s.alt} loading="lazy" width="1920" height="1440" />
          <div className="step-verb-wrap">
            <p className="step-verb display" aria-hidden="true">{s.verb}</p>
          </div>
          <div className="step-text-wrap">
            <p className="step-text"><strong className="visually-hidden">{s.verb}. </strong>{s.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Questions() {
  return (
    <section className="faq" id="questions" aria-labelledby="faq-title">
      <div className="faq-row faq-head">
        <h2 id="faq-title" className="faq-q faq-title">Before you book</h2>
      </div>
      {FAQ.map(([q, a]) => (
        <div className="faq-row" key={q}>
          <h3 className="faq-q">{q}</h3>
          <p className="faq-a">{a}</p>
        </div>
      ))}
    </section>
  );
}

function BookBand() {
  return (
    <section aria-labelledby="book-title">
      <Link to="/account/book" className="band">
        <span className="band-note">Choose a service, a stylist and a time. It takes about a minute.</span>
        <svg className="band-arrow" viewBox="0 0 48 48" aria-hidden="true"><path d="M12 36 36 12M16 12h20v20" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
        <span id="book-title" className="band-word display">Book</span>
      </Link>
    </section>
  );
}

function Footer({ accountLink }) {
  return (
    <footer className="foot" aria-labelledby="foot-title">
      <h2 id="foot-title" className="foot-mark display">Onda</h2>
      <div className="foot-row">
        <ul className="foot-places">
          <li><a href="https://maps.google.com/?q=48+Harbour+Lane" target="_blank" rel="noreferrer">48 Harbour Lane</a></li>
          <li><a href="tel:+15550100">+1 555 0100</a></li>
          <li><a href="mailto:hello@onda.studio">hello@onda.studio</a></li>
        </ul>
        <div className="foot-cols">
          <div>
            <h3>Hours</h3>
            <ul>{HOURS.map(([d, h]) => <li key={d}>{d}<br />{h}</li>)}</ul>
          </div>
          <div>
            <h3>Studio</h3>
            <ul>
              <li><a href="#services">Services and prices</a></li>
              <li><a href="#stylists">Stylists</a></li>
              <li><a href="#questions">Questions</a></li>
            </ul>
          </div>
          <div>
            <h3>Account</h3>
            <ul>
              <li><Link to={accountLink}>Sign in</Link></li>
              <li><Link to="/register">Create an account</Link></li>
              <li><Link to="/login?staff=1">Staff sign in</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="foot-credits">
        Pictures: <a href="https://commons.wikimedia.org/w/index.php?curid=180549242">“Salon de Coiffure Le Temps d’une Coupe Estrablin 06”</a> and <a href="https://commons.wikimedia.org/w/index.php?curid=180549243">“…08”</a> by Jlgay38, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; <a href="https://commons.wikimedia.org/w/index.php?curid=130250557">“Shelve with various hair colours”</a> by Pittigrilli, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; <a href="https://commons.wikimedia.org/w/index.php?curid=87189505">two portraits</a> <a href="https://commons.wikimedia.org/w/index.php?curid=87224896">from Mitzi’s Hairdressers</a> by State Government Photographer, CC0; <a href="https://commons.wikimedia.org/w/index.php?curid=64429213">“A hairdresser at work in Ivory Coast”</a> by Melchisedek ABAKA, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; <a href="https://www.artic.edu/artworks/30918">“Woman Arranging Her Hair”</a> by Kyosen, 1765, public domain, Art Institute of Chicago; <a href="https://commons.wikimedia.org/w/index.php?curid=26753014">“Leather belt bag with various tools of a hairdresser”</a> by Lisa Risager, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>. All via Wikimedia Commons unless noted.
      </p>
      <div className="foot-legal">
        <span>&copy; {new Date().getFullYear()} Onda Hair Studio</span>
        <a href="#hero-title">Back to top</a>
      </div>
    </footer>
  );
}
