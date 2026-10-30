import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppointments } from './appointments.js';

afterEach(() => vi.unstubAllGlobals());

function stub() {
  const f = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal('fetch', f);
  return f;
}

describe('getAppointments', () => {
  it('omits empty params', async () => {
    const f = stub();
    await getAppointments({ status: 'All', search: '' });
    expect(f.mock.calls[0][0]).toBe('/api/appointments');
  });
  it('encodes search properly', async () => {
    const f = stub();
    await getAppointments({ status: 'Confirmed', search: 'a&b=c (x)' });
    expect(f.mock.calls[0][0]).toBe('/api/appointments?status=Confirmed&search=a%26b%3Dc+%28x%29');
  });
});

describe('misconfigured API address', () => {
  it('explains when /api returns HTML instead of JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } })));
    await expect(getAppointments()).rejects.toThrow('/api returned a web page instead of data');
  });
  it('reports a network failure as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(getAppointments()).rejects.toThrow('Cannot reach the API server');
  });
});
