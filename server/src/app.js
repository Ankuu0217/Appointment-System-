import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import env from './config/env.js';
import appointmentRoutes from './routes/appointments.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// CORS_ORIGIN entries may use "*" as a wildcard, e.g. https://*.vercel.app for preview deployments.
const allowedOrigins = env.CORS_ORIGIN.map((o) =>
  o.includes('*') ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+')}$`) : o
);

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Used by Render / Docker health checks: 503 until the database connection is up.
app.get('/api/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db: db ? 'connected' : 'disconnected' });
});

app.use('/api/appointments', appointmentRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
