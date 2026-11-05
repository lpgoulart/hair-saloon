import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './openapi.js';
import { isEmpty } from './db.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import appointmentRoutes from './routes/appointments.js';
import statsRoutes from './routes/stats.js';
import clientRoutes from './routes/clients.js';

if (isEmpty()) {
  console.log('Empty database: seeding demo data…');
  seed();
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// API documentation: raw OpenAPI JSON and an interactive Swagger UI page.
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'Onda API docs',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui, .swagger-ui .info .title, .swagger-ui .opblock-tag { font-family: system-ui, sans-serif }
    @media (prefers-color-scheme: light) {
      .swagger-ui .info .title { color: #38450f }
      .swagger-ui .btn.authorize { color: #38450f; border-color: #38450f }
      .swagger-ui .btn.authorize svg { fill: #38450f }
    }
    .swagger-ui .info table { margin: 8px 0 }
    .swagger-ui .info td, .swagger-ui .info th { padding: 4px 12px 4px 0; text-align: left }`,
  swaggerOptions: {
    persistAuthorization: true, // keep the pasted token across reloads
    docExpansion: 'list',
    tagsSorter: undefined,
    operationsSorter: undefined,
    displayRequestDuration: true,
    filter: true,
  },
}));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/clients', clientRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`Onda API listening on http://localhost:${PORT}`));
