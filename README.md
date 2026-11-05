# Onda Hair Studio

Salon management system in two separate apps:

| Folder | What it is | Stack |
| --- | --- | --- |
| `backend/` | REST API: auth, services, stylists, availability, appointments, statistics | Node 22, Express, built-in `node:sqlite`, JWT |
| `frontend/` | Landing page, client area, staff area | React 18, Vite, React Router, Recharts |

## Run it

Requires Node 22.13 or newer (for `node:sqlite`, no native build needed).

```bash
cd backend && npm install && npm start      # http://localhost:4000, seeds demo data on first run
cd frontend && npm install && npm run dev   # http://localhost:5173, proxies /api to :4000
```

Reset the demo data at any time with `npm run seed` in `backend/`.

**Demo accounts** (password `onda1234`; the sign-in page has buttons that fill them in):

- `client@onda.studio` – Sofia, a client with history and an upcoming visit
- `marina@onda.studio` – stylist (also `theo@`, `ayo@`, `lucia@onda.studio`)
- `admin@onda.studio` – studio manager

## Live deployment

| Part | Where | How it deploys |
| --- | --- | --- |
| Website | GitHub Pages: https://lpgoulart.github.io/hair-saloon/ | `.github/workflows/deploy-pages.yml` on every push to `main` that touches `frontend/` (or run it by hand from the Actions tab) |
| API | Render free web service (expected URL https://onda-salon-api.onrender.com) | `render.yaml` blueprint; Render redeploys on every push to `main` |

**One-time setup**
1. GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then re-run the "Deploy frontend to GitHub Pages" workflow from the Actions tab.
2. Render: **New → Blueprint**, pick this repository, **Apply**. It creates `onda-salon-api` with a generated `JWT_SECRET` and CORS limited to `https://lpgoulart.github.io`.
3. If Render gives the service a different address, set it in GitHub: **Settings → Secrets and variables → Actions → Variables → New variable** `API_URL` = `https://<your-service>.onrender.com/api`, then re-run the workflow.

**Free-plan behaviour.** The API sleeps after ~15 minutes idle, so the first request then takes up to a minute. Its disk is wiped on every deploy or restart, and the demo data is reseeded on start, so bookings made on the live site don't last. For real use, give the service a persistent disk (point `DB_PATH` at it) or move to a hosted database.

API docs live: https://onda-salon-api.onrender.com/api/docs

## API documentation

Interactive Swagger UI at **http://localhost:4000/api/docs** (also through the frontend at http://localhost:5173/api/docs). It documents every endpoint: who may call it, parameters, request and response bodies with examples, and every error. To try the protected ones, run `POST /auth/login` on the page, press **Authorize** and paste the token.

The raw OpenAPI 3 spec is at `/api/openapi.json`; its source is `backend/src/openapi.js`. Update it when you change a route.

## What's in it

**Landing page** (`/`): services and prices with a live "next free chair" for every service, read straight from the appointment book; stylists with real ratings; scroll-driven motion (hero card that shrinks away, pinned headings with pictures passing beneath them, full-screen step panels).

**Client area** (`/account`), three pages and no statistics:
- Book a visit: service, stylist (or any), day, time; only free times are offered
- My appointments: upcoming visits to move (including changing stylist) or cancel; history with status; rate completed visits
- Profile: name, phone, password

**Staff area** (`/staff`). What you see depends on who signs in:

| | Stylist (`role: staff`) | Manager (`role: admin`) |
| --- | --- | --- |
| Today, Schedule, Appointments | only their own chair | every stylist |
| Booking and moving | only into their own chair | any stylist |
| Clients | only clients they've had, with visits and spend from their own appointments | every client, lifetime figures |
| Statistics | only their own appointments | whole studio, plus a per-stylist table |
| Services | price list, read-only | add, edit, hide, change prices |

- Today: the day's book, who's up next, one-click Confirm / Done / No-show / Cancel / Reopen
- Schedule: day calendar with a column per stylist; click an empty hour to book, click an appointment for details, notes and moving it
- Appointments: filter by date range, status, stylist (manager), client or service
- Statistics (7 / 30 / 90 / 365 days, compared with the previous period): revenue, completed visits, average ticket, how full the chair(s) were, clients served and returning rate, new clients, cancellation and no-show rates, revenue trend, revenue by service and category, outcomes, latest ratings, busiest weekday × hour

## Rules enforced by the API

- Opening hours: Tue–Wed 9–19, Thu–Fri 9–20, Sat 8–17, closed Sun–Mon (`backend/src/lib/time.js`)
- No double booking per stylist; no booking in the past or outside opening hours; 30 minutes' notice
- Clients only see and change their own appointments; staff endpoints return 403 to clients
- Stylists are limited to their own chair on the server (`stylistScope` in `backend/src/auth.js`), not only in the screens: other stylists' appointments return 404, booking into another chair returns 403

## Configuration

| Variable | Where | Default |
| --- | --- | --- |
| `PORT` | backend | `4000` |
| `JWT_SECRET` | backend | dev-only value; **set this in production** |
| `DB_PATH` | backend | `backend/data/salon.db` |
| `CORS_ORIGIN` | backend | any origin (comma-separated list to restrict) |
| `VITE_API_URL` | frontend build | `/api` |

Currency and locale are set in `frontend/src/lib/format.js` (USD, en-US).

## Before going live

- Replace the sample content: studio address, phone, email, stylist names and bios, prices.
- The landing page uses openly licensed pictures (credited in the page footer; list in `frontend/public/assets/credits.json`). They show salons and hairstyles in general, not this studio; swap in your own photographs.
- Set `JWT_SECRET`, and add email/SMS reminders and password reset if you need them (not included).
