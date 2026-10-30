import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set before app.js (and env.js) are imported, which happens in beforeAll.
process.env.CORS_ORIGIN = 'https://app.example.com,https://*.vercel.app';

let app;
let mongo;
beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const allowOrigin = async (origin) =>
  (await request(app).get('/api/appointments-nope').set('Origin', origin)).headers['access-control-allow-origin'];

describe('CORS', () => {
  it('allows an exact origin', async () => {
    expect(await allowOrigin('https://app.example.com')).toBe('https://app.example.com');
  });
  it('allows a wildcard match', async () => {
    expect(await allowOrigin('https://my-app-git-feature-me.vercel.app')).toBe('https://my-app-git-feature-me.vercel.app');
  });
  it('rejects look-alike and other origins', async () => {
    expect(await allowOrigin('https://evil.com')).toBeUndefined();
    expect(await allowOrigin('https://evil.vercel.app.evil.com')).toBeUndefined();
    expect(await allowOrigin('https://a/b.vercel.app')).toBeUndefined();
  });
});

describe('GET /api/health', () => {
  it('returns 503 while the database is disconnected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, db: 'disconnected' });
  });
  it('returns 200 once connected', async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'connected' });
  });
  it('does not send X-Powered-By', async () => {
    expect((await request(app).get('/api/health')).headers['x-powered-by']).toBeUndefined();
  });
});
