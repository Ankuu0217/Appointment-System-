import mongoose from 'mongoose';
import env from './env.js';

let memoryServer = null;

export async function connectDB() {
  let uri = env.MONGODB_URI;
  if (env.USE_MEMORY_DB) {
    // Dev dependency: only loaded when the in-memory database is requested.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  try {
    await mongoose.connect(uri, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    throw new Error(explainConnectError(err));
  }
  return { memory: env.USE_MEMORY_DB, host: mongoose.connection.host, name: mongoose.connection.name };
}

// Turns the driver's terse errors into a next step. Never includes the URI, which holds the password.
function explainConnectError(err) {
  const msg = err.message || String(err);
  if (/bad auth|authentication failed/i.test(msg)) {
    return `${msg}\n  → MongoDB rejected the username/password in MONGODB_URI (server/.env).\n` +
      '    Atlas: Security → Database Access → use a *database user* (not your Atlas login), Edit → Edit Password,\n' +
      '    paste it without < >, and URL-encode @ : / ? # % in the password. Changes take ~1 minute to apply.';
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return `${msg}\n  → The cluster host in MONGODB_URI could not be resolved. Check the hostname and your internet connection.`;
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return `${msg}\n  → Nothing is listening at that address. Start MongoDB, or use \`npm run dev:memory\`.`;
  }
  if (err.name === 'MongooseServerSelectionError') {
    return `${msg}\n  → Could not reach the cluster. Atlas: Security → Network Access → add your current IP address.`;
  }
  return msg;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
  memoryServer = null;
}
