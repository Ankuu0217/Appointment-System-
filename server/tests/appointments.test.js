import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import Appointment from '../src/models/Appointment.js';
import escapeRegex from '../src/utils/escapeRegex.js';

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Appointment.deleteMany({});
  const at = new Date('2030-01-01T10:00:00Z');
  await Appointment.create([
    { customerName: 'Alex Morgan', service: 'Haircut', scheduledAt: at, status: 'Pending' },
    { customerName: 'Taylor Smith', service: 'Consultation', scheduledAt: at, status: 'Cancelled' },
    { customerName: 'Jamie Lee', service: 'Massage', scheduledAt: at, status: 'Confirmed' },
  ]);
});

const names = (res) => res.body.data.map((a) => a.customerName).sort();

describe('GET /api/appointments', () => {
  it('lists all appointments with counts', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.counts).toEqual({ All: 3, Pending: 1, Confirmed: 1, Cancelled: 1 });
  });

  it('filters by status; counts ignore the status filter', async () => {
    const res = await request(app).get('/api/appointments?status=Confirmed');
    expect(names(res)).toEqual(['Jamie Lee']);
    expect(res.body.meta.counts.All).toBe(3);
  });

  it('rejects an invalid status', async () => {
    const res = await request(app).get('/api/appointments?status=Nope');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an appointment', async () => {
    const res = await request(app).post('/api/appointments').send({ customerName: 'Sam', service: 'Cut', scheduledAt: '2030-02-01T10:00:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/appointments').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it.each([null, 0, '', 'banana', undefined])('rejects scheduledAt %p', async (scheduledAt) => {
    const res = await request(app).post('/api/appointments').send({ customerName: 'Sam', service: 'Cut', scheduledAt });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('scheduledAt');
  });
});

describe('search', () => {
  it('matches partially and case-insensitively', async () => {
    expect(names(await request(app).get('/api/appointments?search=ale'))).toEqual(['Alex Morgan']);
    expect(names(await request(app).get('/api/appointments?search=SMITH'))).toEqual(['Taylor Smith']);
  });

  it('does not search the service field', async () => {
    const res = await request(app).get('/api/appointments?search=haircut');
    expect(res.body.data).toHaveLength(0);
  });

  it('treats whitespace-only as no search', async () => {
    const res = await request(app).get('/api/appointments?search=%20%20%20');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it('trims the search term', async () => {
    expect(names(await request(app).get('/api/appointments?search=%20ale%20'))).toEqual(['Alex Morgan']);
  });

  it('combines with status (AND) and counts reflect the search across statuses', async () => {
    const res = await request(app).get('/api/appointments?search=a&status=Confirmed');
    expect(names(res)).toEqual(['Jamie Lee']);
    expect(res.body.meta.counts).toEqual({ All: 3, Pending: 1, Confirmed: 1, Cancelled: 1 });
    const narrower = await request(app).get('/api/appointments?search=ale&status=Confirmed');
    expect(narrower.body.data).toHaveLength(0);
    expect(narrower.body.meta.counts).toEqual({ All: 1, Pending: 1, Confirmed: 0, Cancelled: 0 });
  });

  it('returns empty data and zero counts when nothing matches', async () => {
    const res = await request(app).get('/api/appointments?search=zzz');
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.counts).toEqual({ All: 0, Pending: 0, Confirmed: 0, Cancelled: 0 });
  });

  it.each(['(', '.*', '[', '\\', '+'])('matches %s literally without erroring', async (term) => {
    const res = await request(app).get('/api/appointments').query({ search: term });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('accepts exactly 100 characters and rejects 101', async () => {
    expect((await request(app).get(`/api/appointments?search=${'a'.repeat(100)}`)).status).toBe(200);
    const res = await request(app).get(`/api/appointments?search=${'a'.repeat(101)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'search', message: 'Search must be at most 100 characters.' }]);
  });

  it('rejects a repeated search param', async () => {
    const res = await request(app).get('/api/appointments?search=a&search=b');
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'search', message: 'Search must be text.' }]);
  });
});

describe('escapeRegex', () => {
  it('escapes all metacharacters', () => {
    const input = '.*+?^${}()|[]\\';
    const re = new RegExp(escapeRegex(input));
    expect(re.test(input)).toBe(true);
    expect(escapeRegex(input)).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });
  it('leaves plain text alone', () => {
    expect(escapeRegex('Alex Morgan')).toBe('Alex Morgan');
  });
});
