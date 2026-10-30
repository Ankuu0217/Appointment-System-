import env, { assertEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import seedIfEmpty from './config/seed.js';
import app from './app.js';

async function start() {
  assertEnv();
  const { memory, host, name } = await connectDB();
  console.log(`MongoDB connected: ${memory ? 'in-memory' : `${host}/${name}`}`);

  if (memory || env.SEED_ON_START) {
    const added = await seedIfEmpty();
    if (added) console.log(`Seeded ${added} demo appointments.`);
  }

  const server = app.listen(env.PORT, () => console.log(`API listening on :${env.PORT} (${env.NODE_ENV})`));

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down.`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(`Failed to start: ${err.message}`);
  process.exit(1);
});
