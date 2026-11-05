// OpenAPI 3.0 description of the Onda API. Served as JSON at /api/openapi.json and rendered at /api/docs.
// Keep this in step with src/routes/*.js when an endpoint changes.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, example) => ({ 'application/json': { schema, ...(example !== undefined ? { example } : {}) } });
const body = (schema, example, required = true) => ({ required, content: json(schema, example) });
const ok = (description, schema, example) => ({ description, content: json(schema, example) });
const err = (description, example) => ({ description, content: json(ref('Error'), { error: example }) });

const R401 = err('No token, or the token is invalid or expired.', 'Sign in required.');
const R403 = err('Signed in, but this role may not do this.', 'You do not have access to this.');
const R404appt = err('No such appointment, or it is not one the caller may see. A stylist asking for another stylist\'s appointment gets this too.', 'Appointment not found.');

const AUTH = [{ bearerAuth: [] }];

const pathId = (what) => ({ name: 'id', in: 'path', required: true, description: `${what} id`, schema: { type: 'integer', example: 42 } });
const q = (name, description, schema, example) => ({ name, in: 'query', required: false, description, schema: { ...schema, ...(example !== undefined ? { example } : {}) } });
const qReq = (name, description, schema, example) => ({ ...q(name, description, schema, example), required: true });

const appointmentExample = {
  id: 2401, startAt: '2026-11-10 11:00', endAt: '2026-11-10 12:00', status: 'confirmed', priceCents: 6500,
  notes: 'Bringing a photo of the cut', staffNotes: null, rating: null, review: null, createdAt: '2026-11-05 13:12:40',
  serviceId: 1, serviceName: 'Signature cut and finish', category: 'Cut & style', durationMin: 60,
  staffId: 2, staffName: 'Marina Costa', staffPhoto: null,
  clientId: 6, clientName: 'Sofia Almeida', clientEmail: 'client@onda.studio', clientPhone: '+1 555 0199',
};

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Onda Hair Studio API',
    version: '1.0.0',
    description: [
      'REST API behind the Onda landing page, client area and staff area.',
      '',
      '### Getting a token',
      '1. Call **POST /auth/login** (try it below) with a demo account. All demo passwords are `onda1234`:',
      '   - `client@onda.studio`: a client',
      '   - `marina@onda.studio`: a stylist (also `theo@`, `ayo@`, `lucia@onda.studio`)',
      '   - `admin@onda.studio`: the studio manager',
      '2. Copy `token` from the response, press **Authorize** and paste it. Every padlocked call then sends `Authorization: Bearer <token>`.',
      '',
      '### Roles',
      '| Role | Who | Sees |',
      '| --- | --- | --- |',
      '| `client` | a customer | only their own appointments |',
      '| `staff` | a stylist | only appointments in **their own chair**: lists, statistics, clients and bookings are all scoped to them on the server |',
      '| `admin` | the studio manager | everything; the only role that can change services and prices |',
      '',
      '### Conventions',
      '- Times are salon-local strings, `YYYY-MM-DD HH:MM` (dates `YYYY-MM-DD`, times `HH:MM`). No time zones.',
      '- Money is in **cents** (`priceCents: 6500` is $65.00).',
      '- Errors always look like `{ "error": "message for a person" }` with a 4xx/5xx status.',
      '- Opening hours: Tue–Wed 09:00–19:00, Thu–Fri 09:00–20:00, Sat 08:00–17:00, closed Sun–Mon. Bookable starts are every 30 minutes, need 30 minutes\' notice, and the whole service must fit before closing.',
      '- Appointment status moves through `pending` → `confirmed` → `completed`, or ends as `cancelled` / `no_show`.',
    ].join('\n'),
  },
  servers: [{ url: '/api', description: 'This server' }],
  tags: [
    { name: 'Health', description: 'Is the API up?' },
    { name: 'Auth', description: 'Sign up, sign in and the signed-in account.' },
    { name: 'Catalog', description: 'Public data for the website and booking: services, stylists, hours, free times. No sign-in needed, except changing services (manager only).' },
    { name: 'Appointments', description: 'Booking and managing appointments. What the caller sees and may change depends on their role.' },
    { name: 'Clients', description: 'Client records for staff. Stylists see only clients they have had in their chair.' },
    { name: 'Statistics', description: 'Figures for the staff area. Stylists get only their own chair, the manager the whole studio.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token from POST /auth/login or /auth/register. Valid for 7 days.' },
    },
    schemas: {
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'string', example: 'That time was just taken. Please pick another.' } } },
      Role: { type: 'string', enum: ['client', 'staff', 'admin'], description: '`staff` is a stylist, `admin` the studio manager.' },
      Status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 6 },
          name: { type: 'string', example: 'Sofia Almeida' },
          email: { type: 'string', format: 'email', example: 'client@onda.studio' },
          phone: { type: 'string', nullable: true, example: '+1 555 0199' },
          role: ref('Role'),
          title: { type: 'string', nullable: true, description: 'Job title, stylists only.', example: null },
          bio: { type: 'string', nullable: true, example: null },
          photo: { type: 'string', nullable: true, example: null },
          createdAt: { type: 'string', example: '2026-05-08 09:30' },
        },
      },
      AuthResult: { type: 'object', properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…' }, user: ref('User') } },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Signature cut and finish' },
          category: { type: 'string', example: 'Cut & style' },
          description: { type: 'string', example: 'Consultation, wash, precision cut and a finish that you can recreate at home.' },
          durationMin: { type: 'integer', example: 60 },
          priceCents: { type: 'integer', example: 6500 },
          active: { type: 'integer', enum: [0, 1], description: '1 = shown on the website and bookable.', example: 1 },
        },
      },
      ServiceInput: {
        type: 'object', required: ['name', 'category', 'durationMin', 'priceCents'],
        properties: {
          name: { type: 'string', example: 'Curl refresh' },
          category: { type: 'string', example: 'Cut & style' },
          description: { type: 'string', example: 'Dry cut and diffuse for curls between full cuts.' },
          durationMin: { type: 'integer', minimum: 15, maximum: 480, example: 45 },
          priceCents: { type: 'integer', minimum: 0, example: 5000 },
          active: { type: 'boolean', default: true, description: '`false` hides it from the website and booking.' },
        },
      },
      Stylist: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'Marina Costa' },
          title: { type: 'string', example: 'Creative director' },
          bio: { type: 'string', example: 'Fifteen years of colour work; balayage and lived-in blondes are her daily language.' },
          photo: { type: 'string', nullable: true, example: null },
          rating: { type: 'number', nullable: true, description: 'Average of all ratings clients gave her visits.', example: 4.66 },
          reviews: { type: 'integer', description: 'Number of rated visits.', example: 214 },
        },
      },
      Hours: {
        type: 'object',
        description: 'Keyed by weekday, 0 = Sunday … 6 = Saturday. `null` = closed.',
        additionalProperties: { type: 'object', nullable: true, properties: { open: { type: 'string', example: '09:00' }, close: { type: 'string', example: '19:00' } } },
        example: { 0: null, 1: null, 2: { open: '09:00', close: '19:00' }, 3: { open: '09:00', close: '19:00' }, 4: { open: '09:00', close: '20:00' }, 5: { open: '09:00', close: '20:00' }, 6: { open: '08:00', close: '17:00' } },
      },
      DayAvailability: {
        type: 'object',
        properties: {
          staffId: { type: 'integer', example: 2 },
          staffName: { type: 'string', example: 'Marina Costa' },
          slots: { type: 'array', items: { type: 'string' }, description: 'Free start times that day for the chosen service.', example: ['09:00', '09:30', '14:00'] },
        },
      },
      Opening: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-11-06' },
          time: { type: 'string', example: '11:30' },
          staffId: { type: 'integer', example: 3 },
          staffName: { type: 'string', example: 'Theo Laurent' },
        },
      },
      PublicReview: {
        type: 'object',
        properties: {
          rating: { type: 'integer', example: 5 }, review: { type: 'string', example: 'Exactly the cut I described, and it grows out well.' },
          date: { type: 'string', example: '2026-11-03' }, serviceName: { type: 'string', example: 'Signature cut and finish' },
          staffName: { type: 'string', example: 'Theo Laurent' }, clientFirstName: { type: 'string', example: 'Sofia' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          startAt: { type: 'string', description: 'Salon-local `YYYY-MM-DD HH:MM`.' },
          endAt: { type: 'string', description: 'Start plus the service duration.' },
          status: ref('Status'),
          priceCents: { type: 'integer', description: 'Price at the time of booking.' },
          notes: { type: 'string', nullable: true, description: 'Note the client wrote when booking.' },
          staffNotes: { type: 'string', nullable: true, description: 'Private staff note (formula, preferences).' },
          rating: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          review: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
          serviceId: { type: 'integer' }, serviceName: { type: 'string' }, category: { type: 'string' }, durationMin: { type: 'integer' },
          staffId: { type: 'integer' }, staffName: { type: 'string' }, staffPhoto: { type: 'string', nullable: true },
          clientId: { type: 'integer' }, clientName: { type: 'string' }, clientEmail: { type: 'string' }, clientPhone: { type: 'string', nullable: true },
        },
        example: appointmentExample,
      },
      ClientSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 6 }, name: { type: 'string', example: 'Sofia Almeida' },
          email: { type: 'string', example: 'client@onda.studio' }, phone: { type: 'string', nullable: true, example: '+1 555 0199' },
          createdAt: { type: 'string', example: '2026-05-08 09:30' },
          visits: { type: 'integer', description: 'Completed visits (for a stylist: with them).', example: 7 },
          spentCents: { type: 'integer', description: 'Paid for completed visits (for a stylist: with them).', example: 93500 },
          lastVisit: { type: 'string', nullable: true, example: '2026-09-23 09:00' },
          nextVisit: { type: 'string', nullable: true, example: null },
          noShows: { type: 'integer', example: 1 },
        },
      },
      ClientLookup: {
        type: 'object', description: 'Name and contact only; returned when `lookup=1`.',
        properties: { id: { type: 'integer', example: 6 }, name: { type: 'string', example: 'Sofia Almeida' }, email: { type: 'string', example: 'client@onda.studio' }, phone: { type: 'string', nullable: true, example: '+1 555 0199' } },
      },
      Overview: {
        type: 'object',
        properties: {
          scope: { type: 'object', nullable: true, description: 'Set when the figures are one stylist\'s only; `null` for the whole studio.', properties: { staffId: { type: 'integer' }, name: { type: 'string' } }, example: { staffId: 2, name: 'Marina Costa' } },
          range: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, days: { type: 'integer' } }, example: { from: '2026-10-07', to: '2026-11-05', days: 30 } },
          kpis: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'All bookings starting in the period, any status.' },
              completed: { type: 'integer' }, cancelled: { type: 'integer' }, noShow: { type: 'integer' },
              revenueCents: { type: 'integer', description: 'Sum of completed visits.' },
              avgTicketCents: { type: 'integer', description: 'Revenue ÷ completed visits.' },
              clients: { type: 'integer', description: 'Distinct clients with a booking in the period.' },
              newClients: { type: 'integer', description: 'Clients whose first (non-cancelled) visit falls in the period; for a stylist, first visit with them.' },
              rating: { type: 'number', nullable: true, description: 'Average rating in the period.' },
              cancelRate: { type: 'number', description: '% of bookings cancelled.' },
              noShowRate: { type: 'number', description: '% of bookings that were no-shows.' },
              utilization: { type: 'number', description: '% of opening-hour minutes booked (pending, confirmed or completed), up to now.' },
              returningRate: { type: 'number', description: '% of clients served who had a completed visit before the period.' },
              change: {
                type: 'object', description: '% change against the previous period of the same length. `null` when there is nothing to compare with.',
                properties: { revenue: { type: 'number', nullable: true }, completed: { type: 'number', nullable: true }, avgTicket: { type: 'number', nullable: true }, newClients: { type: 'number', nullable: true } },
              },
            },
            example: { total: 106, completed: 80, cancelled: 13, noShow: 9, revenueCents: 792500, avgTicketCents: 9906, clients: 91, newClients: 30, rating: 4.72, cancelRate: 12.3, noShowRate: 8.5, utilization: 53, returningRate: 49.5, change: { revenue: -10.9, completed: -7, avgTicket: -4.2, newClients: -26.8 } },
          },
          daily: { type: 'array', description: 'One row per day of the period.', items: { type: 'object', properties: { date: { type: 'string' }, open: { type: 'boolean', description: 'Studio open that day.' }, revenueCents: { type: 'integer' }, visits: { type: 'integer' }, booked: { type: 'integer' } } } },
          byStatus: { type: 'array', items: { type: 'object', properties: { status: ref('Status'), n: { type: 'integer' } } } },
          topServices: { type: 'array', description: 'Non-cancelled bookings per service, by revenue.', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, category: { type: 'string' }, bookings: { type: 'integer' }, revenueCents: { type: 'integer' } } } },
          byCategory: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, revenueCents: { type: 'integer' }, visits: { type: 'integer' } } } },
          staff: { type: 'array', description: 'Per stylist. A stylist gets a single row: their own.', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, title: { type: 'string' }, booked: { type: 'integer' }, completed: { type: 'integer' }, noShow: { type: 'integer' }, revenueCents: { type: 'integer' }, rating: { type: 'number', nullable: true }, utilization: { type: 'number' } } } },
          heat: { type: 'array', description: 'Non-cancelled bookings by weekday (0 = Sunday) and starting hour.', items: { type: 'object', properties: { dow: { type: 'integer' }, hour: { type: 'integer' }, n: { type: 'integer' } } } },
          reviews: { type: 'array', description: 'Up to 6 latest rated visits in the period.', items: { type: 'object', properties: { rating: { type: 'integer' }, review: { type: 'string', nullable: true }, startAt: { type: 'string' }, serviceName: { type: 'string' }, staffName: { type: 'string' }, clientName: { type: 'string' } } } },
        },
      },
      Today: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-11-05' },
          scope: { type: 'object', nullable: true, properties: { staffId: { type: 'integer' } }, example: null },
          appointments: { type: 'array', items: ref('Appointment') },
          next7: { type: 'object', description: 'Upcoming pending/confirmed bookings from now to 7 days ahead.', properties: { count: { type: 'integer', example: 102 }, valueCents: { type: 'integer', example: 980500 } } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Health check', description: 'Returns `{ ok: true }` when the API is running.', responses: { 200: ok('Running.', { type: 'object', properties: { ok: { type: 'boolean' } } }, { ok: true }) } },
    },

    // ---------- Auth ----------
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create a client account',
        description: 'Creates an account with role `client` and signs it in. Staff accounts are not created here.',
        requestBody: body({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' }, password: { type: 'string', minLength: 8 } } },
          { name: 'Ana Ribeiro', email: 'ana.ribeiro@example.com', phone: '+1 555 0123', password: 'a-long-password' }),
        responses: {
          201: ok('Account created; use `token` for the next calls.', ref('AuthResult')),
          400: err('Missing name, invalid email, or password shorter than 8 characters.', 'Password must be at least 8 characters.'),
          409: err('Email already registered.', 'An account with this email already exists.'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Sign in',
        description: 'Checks email and password and returns a token valid for 7 days. Works for every role.',
        requestBody: body({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
          { email: 'client@onda.studio', password: 'onda1234' }),
        responses: {
          200: ok('Signed in.', ref('AuthResult')),
          401: err('Wrong email or password (the message does not say which).', 'Email or password is incorrect.'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'The signed-in account', security: AUTH,
        responses: { 200: ok('The account behind the token.', ref('User')), 401: R401 },
      },
      patch: {
        tags: ['Auth'], summary: 'Update my profile', security: AUTH,
        description: 'Changes name, phone and/or password of the signed-in account. Send only what changes. Email and role cannot be changed.',
        requestBody: body({ type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, password: { type: 'string', minLength: 8 } } }, { phone: '+1 555 0142' }),
        responses: { 200: ok('Updated account.', ref('User')), 400: err('Password too short.', 'Password must be at least 8 characters.'), 401: R401 },
      },
    },

    // ---------- Catalog ----------
    '/services': {
      get: {
        tags: ['Catalog'], summary: 'List services',
        description: 'The price list, ordered by category then price. Hidden services are left out unless `all=1`.',
        parameters: [q('all', '`1` to include hidden (inactive) services.', { type: 'string', enum: ['1'] })],
        responses: { 200: ok('Services.', { type: 'array', items: ref('Service') }) },
      },
      post: {
        tags: ['Catalog'], summary: 'Add a service', security: AUTH,
        description: '**Manager only** (`admin`). Stylists and clients get 403.',
        requestBody: body(ref('ServiceInput')),
        responses: { 201: ok('Created.', ref('Service')), 400: err('Invalid fields.', 'Duration must be 15 to 480 minutes.'), 401: R401, 403: R403 },
      },
    },
    '/services/{id}': {
      put: {
        tags: ['Catalog'], summary: 'Edit a service', security: AUTH,
        description: '**Manager only** (`admin`). Replaces every field. Changing a price does not change existing bookings, which keep the price they were booked at.',
        parameters: [pathId('Service')],
        requestBody: body(ref('ServiceInput'), { name: 'Fringe tidy', category: 'Cut & style', description: 'A quick reshape of the fringe between full cuts.', durationMin: 15, priceCents: 1800, active: true }),
        responses: { 200: ok('Updated.', ref('Service')), 400: err('Invalid fields.', 'Name and category are required.'), 401: R401, 403: R403, 404: err('No such service.', 'Service not found.') },
      },
    },
    '/stylists': {
      get: {
        tags: ['Catalog'], summary: 'List stylists',
        description: 'Active stylists with their average rating. The manager account has no title and is not a stylist.',
        responses: { 200: ok('Stylists.', { type: 'array', items: ref('Stylist') }) },
      },
    },
    '/hours': {
      get: { tags: ['Catalog'], summary: 'Opening hours', responses: { 200: ok('Hours by weekday.', ref('Hours')) } },
    },
    '/availability': {
      get: {
        tags: ['Catalog'], summary: 'Free times on one day',
        description: [
          'For each stylist (or one, with `staffId`), the start times on `date` when the whole service fits:',
          'inside opening hours, not overlapping a pending/confirmed/completed booking, at least 30 minutes from now, on a 30-minute grid.',
          'A closed day returns every stylist with an empty `slots` list.',
        ].join(' '),
        parameters: [
          qReq('date', 'Day to check.', { type: 'string', format: 'date' }, '2026-11-10'),
          qReq('serviceId', 'Service to fit; its duration decides which starts work.', { type: 'integer' }, 1),
          q('staffId', 'Only this stylist.', { type: 'integer' }, 2),
          q('ignoreId', 'Appointment to ignore when checking overlaps. Use it when moving that appointment, so its current slot counts as free.', { type: 'integer' }),
        ],
        responses: {
          200: ok('Free starts per stylist.', { type: 'array', items: ref('DayAvailability') }),
          400: err('Bad date or unknown service.', 'Choose a valid date.'),
        },
      },
    },
    '/openings': {
      get: {
        tags: ['Catalog'], summary: 'Next free times for a service',
        description: 'Scans from today up to 21 days ahead and returns the earliest free starts, one stylist per time. Used by the "Find a time" buttons on the landing page.',
        parameters: [
          qReq('serviceId', 'Service to fit.', { type: 'integer' }, 1),
          q('limit', 'How many (max 20).', { type: 'integer', default: 6, maximum: 20 }),
          q('staffId', 'Only this stylist.', { type: 'integer' }),
        ],
        responses: { 200: ok('Earliest openings.', { type: 'array', items: ref('Opening') }), 400: err('Unknown service.', 'Choose a service.') },
      },
    },
    '/reviews': {
      get: {
        tags: ['Catalog'], summary: 'Latest public reviews',
        description: 'Up to 6 most recent written reviews rated 4 or 5, with the client\'s first name only.',
        responses: { 200: ok('Reviews.', { type: 'array', items: ref('PublicReview') }) },
      },
    },

    // ---------- Appointments ----------
    '/appointments': {
      get: {
        tags: ['Appointments'], summary: 'List appointments', security: AUTH,
        description: [
          'What comes back depends on the caller:',
          '- **client**: only their own appointments (`clientId` and `staffId` are ignored)',
          '- **stylist**: only appointments in their own chair (`staffId` is ignored)',
          '- **manager**: everything, filterable by `staffId` and `clientId`',
        ].join('\n'),
        parameters: [
          q('from', 'First day, inclusive.', { type: 'string', format: 'date' }, '2026-11-01'),
          q('to', 'Last day, inclusive.', { type: 'string', format: 'date' }, '2026-11-30'),
          q('status', 'One status or several, comma-separated.', { type: 'string' }, 'pending,confirmed'),
          q('staffId', 'Manager only: one stylist.', { type: 'integer' }),
          q('clientId', 'Staff only: one client.', { type: 'integer' }),
          q('q', 'Search client name, client email or service name.', { type: 'string' }),
          q('order', 'Sort by start time.', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
          q('limit', 'Max rows (max 2000).', { type: 'integer', default: 500 }),
        ],
        responses: { 200: ok('Appointments.', { type: 'array', items: ref('Appointment') }), 401: R401 },
      },
      post: {
        tags: ['Appointments'], summary: 'Book an appointment', security: AUTH,
        description: [
          'Creates a `confirmed` appointment at the service\'s current price.',
          '- **client** books for themselves; `clientId` is ignored.',
          '- **staff** must send `clientId`. A stylist can only book into their own chair (`staffId` = their id).',
          '',
          'The slot is checked again on the server, so a time that was free when listed can still fail with 409.',
        ].join('\n'),
        requestBody: body({
          type: 'object', required: ['date', 'time', 'staffId', 'serviceId'],
          properties: {
            date: { type: 'string', format: 'date' }, time: { type: 'string', example: '11:00' },
            staffId: { type: 'integer' }, serviceId: { type: 'integer' },
            notes: { type: 'string', maxLength: 500, description: 'Note from the client.' },
            clientId: { type: 'integer', description: 'Required when staff book for a client.' },
          },
        }, { date: '2026-11-10', time: '11:00', staffId: 2, serviceId: 1, notes: 'Bringing a photo of the cut' }),
        responses: {
          201: ok('Booked.', ref('Appointment')),
          400: err('Staff did not say which client.', 'Choose a client for this booking.'),
          401: R401,
          403: err('A stylist tried to book into another stylist\'s chair.', 'You can only book clients into your own chair.'),
          409: err('Slot not bookable: taken, in the past, outside opening hours, or bad date/time/service/stylist.', 'That time was just taken. Please pick another.'),
        },
      },
    },
    '/appointments/{id}': {
      get: {
        tags: ['Appointments'], summary: 'One appointment', security: AUTH,
        description: 'Clients can open their own, stylists those in their chair, the manager any.',
        parameters: [pathId('Appointment')],
        responses: { 200: ok('The appointment.', ref('Appointment')), 401: R401, 404: R404appt },
      },
      patch: {
        tags: ['Appointments'], summary: 'Update status, notes or price (staff)', security: AUTH,
        description: 'Staff only. Send any of the fields. Typical use: `confirmed` → `completed` when the client leaves, or `no_show`. Setting `confirmed` reopens a closed appointment. A stylist can only update appointments in their own chair.',
        parameters: [pathId('Appointment')],
        requestBody: body({ type: 'object', properties: { status: ref('Status'), staffNotes: { type: 'string' }, priceCents: { type: 'integer' } } }, { status: 'completed', staffNotes: 'Gloss 9.1, 20 min' }),
        responses: { 200: ok('Updated.', ref('Appointment')), 400: err('Unknown status.', 'Unknown status.'), 401: R401, 403: R403, 404: R404appt },
      },
    },
    '/appointments/{id}/reschedule': {
      post: {
        tags: ['Appointments'], summary: 'Move an appointment', security: AUTH,
        description: [
          'Moves a `pending` or `confirmed` appointment to a new day and time, and optionally to another stylist.',
          'Its own current slot counts as free.',
          '- **client**: own appointments, before they start',
          '- **stylist**: within their own chair only; moving to another stylist is for the manager',
          '- **manager**: any',
        ].join('\n'),
        parameters: [pathId('Appointment')],
        requestBody: body({ type: 'object', required: ['date', 'time'], properties: { date: { type: 'string', format: 'date' }, time: { type: 'string' }, staffId: { type: 'integer', description: 'New stylist; defaults to the current one.' } } }, { date: '2026-11-12', time: '14:00' }),
        responses: {
          200: ok('Moved.', ref('Appointment')),
          400: err('Not upcoming, or already started.', 'Only upcoming appointments can be moved.'),
          401: R401,
          403: err('A stylist tried to move it to someone else.', 'Ask the manager to move a client to another stylist.'),
          404: R404appt,
          409: err('New slot not bookable.', 'The studio is closed at that time.'),
        },
      },
    },
    '/appointments/{id}/cancel': {
      post: {
        tags: ['Appointments'], summary: 'Cancel an appointment', security: AUTH,
        description: 'Sets status to `cancelled` and frees the slot. Only `pending`/`confirmed`. Clients only before it starts; staff any time (stylists only in their own chair).',
        parameters: [pathId('Appointment')],
        responses: { 200: ok('Cancelled.', ref('Appointment')), 400: err('Already closed, or already started (client).', 'This appointment cannot be cancelled.'), 401: R401, 404: R404appt },
      },
    },
    '/appointments/{id}/review': {
      post: {
        tags: ['Appointments'], summary: 'Rate a visit (client)', security: AUTH,
        description: 'The client who had the visit rates it once it is `completed`. Sending again replaces the rating.',
        parameters: [pathId('Appointment')],
        requestBody: body({ type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, review: { type: 'string', maxLength: 1000 } } }, { rating: 5, review: 'Exactly the cut I described.' }),
        responses: { 200: ok('Saved.', ref('Appointment')), 400: err('Not completed yet, or rating out of range.', 'You can rate a visit once it is completed.'), 401: R401, 404: err('Not this client\'s appointment.', 'Appointment not found.') },
      },
    },

    // ---------- Clients ----------
    '/clients': {
      get: {
        tags: ['Clients'], summary: 'List or look up clients (staff)', security: AUTH,
        description: [
          'Staff only.',
          '- Default: clients with visits, spend, last/next visit and no-shows, sorted by spend. The **manager** gets every client with lifetime figures; a **stylist** gets only clients they have had, with figures from their own appointments.',
          '- `lookup=1`: name and contact of any client (max 20), no figures. Used to pick a client when booking.',
        ].join('\n'),
        parameters: [
          q('q', 'Search name, email or phone.', { type: 'string' }, 'Almeida'),
          q('lookup', '`1` for the short lookup list.', { type: 'string', enum: ['1'] }),
        ],
        responses: {
          200: ok('Clients. `ClientLookup` items when `lookup=1`, otherwise `ClientSummary`.', { type: 'array', items: { oneOf: [ref('ClientSummary'), ref('ClientLookup')] } }),
          401: R401, 403: R403,
        },
      },
      post: {
        tags: ['Clients'], summary: 'Add a client (staff)', security: AUTH,
        description: 'Staff only. For walk-ins and phone bookings. The account gets a random password; the client can use it only after a reset (not built yet).',
        requestBody: body({ type: 'object', required: ['name', 'email'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' } } }, { name: 'Bruno Lima', email: 'bruno.lima@example.com', phone: '+1 555 0177' }),
        responses: { 201: ok('Created.', ref('User')), 400: err('Missing name or bad email.', 'Name and a valid email are required.'), 401: R401, 403: R403, 409: err('Email already used.', 'A client with this email already exists.') },
      },
    },
    '/clients/{id}': {
      get: {
        tags: ['Clients'], summary: 'One client (staff)', security: AUTH,
        description: 'Staff only. A stylist gets 404 for a client they have never had.',
        parameters: [pathId('Client')],
        responses: { 200: ok('The client.', ref('User')), 401: R401, 403: R403, 404: err('Not found, or not one of this stylist\'s clients.', 'Client not found.') },
      },
    },

    // ---------- Statistics ----------
    '/stats/overview': {
      get: {
        tags: ['Statistics'], summary: 'Statistics for a period (staff)', security: AUTH,
        description: 'Staff only. The period ends today and is compared with the period of the same length before it. A **stylist** gets only their own appointments (`scope` is set); the **manager** gets the whole studio (`scope: null`).',
        parameters: [q('days', 'Length of the period, 7 to 365.', { type: 'integer', default: 30, minimum: 7, maximum: 365 }, 30)],
        responses: { 200: ok('Figures.', ref('Overview')), 401: R401, 403: R403 },
      },
    },
    '/stats/today': {
      get: {
        tags: ['Statistics'], summary: 'Today\'s book (staff)', security: AUTH,
        description: 'Staff only. Every appointment today in start order (cancelled ones included) and the next 7 days\' bookings. Stylists get only their own chair.',
        responses: { 200: ok('Today.', ref('Today')), 401: R401, 403: R403 },
      },
    },
  },
};

// Finishing pass over every operation:
// - public endpoints say so explicitly (`security: []`), so "no padlock" is a statement, not an omission
// - each gets a stable operationId, e.g. POST /appointments/{id}/cancel → postAppointmentsIdCancel
for (const [path, item] of Object.entries(openapi.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!op.security) op.security = [];
    if (!op.operationId) {
      const words = path.split('/').filter(Boolean).map((w) => w.replace(/[{}]/g, ''));
      op.operationId = method + words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
    }
  }
}
