import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import env from './config/env.js';
import appointmentRoutes from './routes/appointments.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// CORS_ORIGIN entries may use "*" as a wildcard, e.g. https://*.vercel.app for preview deployments.
// Entries are normalised (quotes and trailing slashes removed) because browsers send origins without them,
// and a URL pasted from the address bar usually ends in "/".
const normaliseOrigin = (o) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '').toLowerCase();
const allowedOrigins = env.CORS_ORIGIN.map(normaliseOrigin).filter(Boolean).map((o) =>
  o.includes('*') ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+')}$`) : o
);
const isAllowedOrigin = (origin) => {
  const o = origin.toLowerCase();
  return allowedOrigins.some((a) => (a instanceof RegExp ? a.test(o) : a === o));
};

const warnedOrigins = new Set();
const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (curl, health checks, same-origin) don't need CORS.
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    if (!warnedOrigins.has(origin)) {
      warnedOrigins.add(origin);
      console.warn(`CORS: blocked origin ${origin}. Allowed: ${env.CORS_ORIGIN.join(', ') || '(none)'}. Add it to CORS_ORIGIN.`);
    }
    return callback(null, false);
  },
};

const app = express();
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json());

// Opening the bare API URL in a browser should say what this is, not 404.
app.get('/', (req, res) => {
  res.json({
    name: 'Appointments API',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      list: 'GET /api/appointments?status=&search=',
      create: 'POST /api/appointments',
    },
  });
});

// Used by Render / Docker health checks: 503 until the database connection is up.
app.get('/api/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db: db ? 'connected' : 'disconnected' });
});

app.use('/api/appointments', appointmentRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
