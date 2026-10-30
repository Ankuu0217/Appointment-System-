import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const rows = [
  { _id: '1', customerName: 'Alex Morgan', service: 'Haircut', scheduledAt: '2030-01-01T10:00:00Z', status: 'Pending' },
  { _id: '2', customerName: 'Taylor Smith', service: 'Consult', scheduledAt: '2030-01-02T10:00:00Z', status: 'Cancelled' },
  { _id: '3', customerName: 'Jamie Lee', service: 'Massage', scheduledAt: '2030-01-03T10:00:00Z', status: 'Confirmed' },
];

function respond(url) {
  const params = new URL(url, 'http://x').searchParams;
  const search = (params.get('search') || '').toLowerCase();
  const status = params.get('status');
  const matched = rows.filter((r) => r.customerName.toLowerCase().includes(search));
  const counts = { All: matched.length, Pending: 0, Confirmed: 0, Cancelled: 0 };
  matched.forEach((r) => { counts[r.status] += 1; });
  const data = status ? matched.filter((r) => r.status === status) : matched;
  return { ok: true, json: async () => ({ data, meta: { total: data.length, counts } }) };
}

let fetchMock;
const urls = () => fetchMock.mock.calls.map(([u]) => u);
const lastParams = () => new URL(urls().at(-1), 'http://x').searchParams;
const flush = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  window.history.replaceState(null, '', '/');
  fetchMock = vi.fn((url) => Promise.resolve(respond(url)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// userEvent hangs under vitest fake timers, so typing is simulated one character at a time.
function setup() {
  render(<App />);
  return {
    type(el, text) {
      let value = el.value;
      for (const ch of text) {
        value += ch;
        fireEvent.change(el, { target: { value } });
      }
    },
    click: (el) => fireEvent.click(el),
    keyboard: () => fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' }),
  };
}

describe('search', () => {
  it('loads the list without search params initially', async () => {
    setup();
    await flush(0);
    expect(urls()).toEqual(['/api/appointments']);
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
  });

  it('typing "ale" quickly sends exactly one request with search=ale', async () => {
    const user = setup();
    await flush(0);
    fetchMock.mockClear();
    user.type(screen.getByRole('searchbox', { name: 'Search by customer name' }), 'ale');
    await flush(299);
    expect(fetchMock).not.toHaveBeenCalled();
    await flush(1);
    expect(urls()).toEqual(['/api/appointments?search=ale']);
    expect(screen.queryByText('Taylor Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1 appointments matching "ale"')).toBeInTheDocument();
    expect(window.location.search).toBe('?search=ale');
  });

  it('the clear button clears the input and refetches without search', async () => {
    const user = setup();
    user.type(screen.getByRole('searchbox'), 'ale');
    await flush(300);
    fetchMock.mockClear();
    user.click(screen.getByRole('button', { name: 'Clear search' }));
    await flush(0);
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(urls()).toEqual(['/api/appointments']);
    expect(window.location.search).toBe('');
  });

  it('Escape clears the input and refetches without search', async () => {
    const user = setup();
    user.type(screen.getByRole('searchbox'), 'ale');
    await flush(300);
    fetchMock.mockClear();
    user.keyboard();
    await flush(0);
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(lastParams().has('search')).toBe(false);
  });

  it('sends search and status together', async () => {
    const user = setup();
    await flush(0);
    user.type(screen.getByRole('searchbox'), 'a');
    await flush(300);
    user.click(screen.getByRole('button', { name: /^Confirmed/ }));
    await flush(0);
    expect(lastParams().get('search')).toBe('a');
    expect(lastParams().get('status')).toBe('Confirmed');
    const url = new URLSearchParams(window.location.search);
    expect(url.get('status')).toBe('Confirmed');
    expect(url.get('search')).toBe('a');
    expect(screen.getByText('Jamie Lee')).toBeInTheDocument();
  });

  it('shows the no-match empty state with a working Clear search button', async () => {
    const user = setup();
    user.type(screen.getByRole('searchbox'), 'zzz');
    await flush(300);
    expect(screen.getByText('No appointments match "zzz".')).toBeInTheDocument();
    user.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1));
    await flush(0);
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
  });

  it('restores search and status from the URL on load', async () => {
    window.history.replaceState(null, '', '/?status=Confirmed&search=jam');
    setup();
    await flush(0);
    expect(screen.getByRole('searchbox')).toHaveValue('jam');
    expect(urls()).toEqual(['/api/appointments?status=Confirmed&search=jam']);
  });

  it('whitespace-only input sends no search', async () => {
    const user = setup();
    await flush(0);
    fetchMock.mockClear();
    user.type(screen.getByRole('searchbox'), '   ');
    await flush(300);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
