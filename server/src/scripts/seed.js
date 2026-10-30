import env, { assertEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import seedIfEmpty from '../config/seed.js';

try {
  assertEnv();
  if (env.USE_MEMORY_DB) throw new Error('Seeding the in-memory database is pointless; set USE_MEMORY_DB=false.');
  const { host, name } = await connectDB();
  const added = await seedIfEmpty();
  console.log(added ? `Seeded ${added} appointments into ${host}/${name}.` : `${host}/${name} already has data; nothing seeded.`);
  await disconnectDB();
} catch (err) {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
}
