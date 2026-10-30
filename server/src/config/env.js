import 'dotenv/config';

const bool = (value, fallback = false) => (value === undefined ? fallback : value === 'true');

// Every runtime setting comes from .env (see .env.example); defaults suit local development.
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  // Used when MONGODB_URI has no database path (e.g. Atlas "...mongodb.net/"); otherwise Mongoose falls back to "test".
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'appointments',
  USE_MEMORY_DB: bool(process.env.USE_MEMORY_DB),
  SEED_ON_START: bool(process.env.SEED_ON_START),
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export function assertEnv() {
  if (!env.USE_MEMORY_DB && !env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env, or set USE_MEMORY_DB=true.');
  }
  if (!Number.isInteger(env.PORT) || env.PORT <= 0) {
    throw new Error(`PORT must be a positive integer (got "${process.env.PORT}").`);
  }
}

export default env;
