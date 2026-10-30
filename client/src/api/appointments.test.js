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
