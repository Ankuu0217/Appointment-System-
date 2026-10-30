import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

let rows;
let failPatch;
let calls;

function json(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function handle(url, options = {}) {
  calls.push({ url, method: options.method || 'GET', body: options.body });
  const u = new URL(url, 'http://x');
  if (options.method === 'PATCH') {
    if (failPatch) return json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } }, false, 404);
    const id = u.pathname.split('/').pop();
    const row = rows.find((r) => r._id === id);
    row.status = JSON.parse(options.body).status;
    return json({ data: { ...row } });
  }
  const status = u.searchParams.get('status');
  const counts = { All: rows.length, Pending: 0, Confirmed: 0, Cancelled: 0 };
  rows.forEach((r) => { counts[r.status] += 1; });
  const data = rows.filter((r) => !status || r.status === status).map((r) => ({ ...r }));
  return json({ data, meta: { total: data.length, counts } });
}

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const select = (name) => screen.getByRole('combobox', { name: `Status for ${name}` });

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/');
  rows = [
    { _id: 'a1', customerName: 'Ankit Singh', service: 'Software', scheduledAt: '2030-01-01T10:00:00Z', status: 'Pending' },
    { _id: 'j1', customerName: 'Jamie Lee', service: 'Follow-up', scheduledAt: '2030-01-02T10:00:00Z', status: 'Pending' },
  ];
  failPatch = false;
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options) => handle(url, options)));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('changing an appointment status', () => {
  it('sends PATCH with only the status, then refreshes the list and tab counts', async () => {
    render(<App />);
    await flush();
    expect(screen.getByRole('button', { name: /^Confirmed/ })).toHaveTextContent('Confirmed0');

    calls = [];
    fireEvent.change(select('Ankit Singh'), { target: { value: 'Confirmed' } });
    await flush();

    expect(calls[0]).toEqual({ url: '/api/appointments/a1', method: 'PATCH', body: JSON.stringify({ status: 'Confirmed' }) });
    expect(calls[1]).toMatchObject({ url: '/api/appointments', method: 'GET' });
    expect(select('Ankit Singh')).toHaveValue('Confirmed');
    expect(screen.getByRole('button', { name: /^Confirmed/ })).toHaveTextContent('Confirmed1');
    expect(screen.getByRole('button', { name: /^Pending/ })).toHaveTextContent('Pending1');
    expect(screen.getByRole('status')).toHaveTextContent('Ankit Singh marked Confirmed.');
  });

  it('removes the row from a filtered view and says where it went', async () => {
    window.history.replaceState(null, '', '/?status=Pending');
    render(<App />);
    await flush();

    fireEvent.change(select('Ankit Singh'), { target: { value: 'Cancelled' } });
    await flush();

    expect(screen.queryByText('Ankit Singh', { selector: '.row-name' })).not.toBeInTheDocument();
    expect(screen.getByText('Jamie Lee')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ankit Singh marked Cancelled (moved from Pending to the Cancelled tab).');
  });

  it('reverts and shows the error in that row when the update fails', async () => {
    failPatch = true;
    render(<App />);
    await flush();

    fireEvent.change(select('Ankit Singh'), { target: { value: 'Confirmed' } });
    await flush();

    expect(select('Ankit Singh')).toHaveValue('Pending');
    expect(select('Ankit Singh')).toBeEnabled();
    const row = select('Ankit Singh').closest('li');
    expect(within(row).getByRole('alert')).toHaveTextContent('Appointment not found.');
    expect(within(select('Jamie Lee').closest('li')).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locks the control while saving', async () => {
    let release;
    vi.stubGlobal('fetch', vi.fn((url, options) =>
      options?.method === 'PATCH' ? new Promise((r) => { release = () => r(handle(url, options)); }) : Promise.resolve(handle(url, options))
    ));
    render(<App />);
    await flush();

    fireEvent.change(select('Ankit Singh'), { target: { value: 'Confirmed' } });
    expect(select('Ankit Singh')).toBeDisabled();
    expect(select('Ankit Singh')).toHaveValue('Confirmed');
    await act(async () => release());
    await flush();
    expect(select('Ankit Singh')).toBeEnabled();
  });

  it('clears the notice after a few seconds', async () => {
    render(<App />);
    await flush();
    fireEvent.change(select('Jamie Lee'), { target: { value: 'Confirmed' } });
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Jamie Lee marked Confirmed.');
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
