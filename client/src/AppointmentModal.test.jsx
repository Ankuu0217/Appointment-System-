import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

let rows;
let calls;
let failDelete;

const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

function handle(url, options = {}) {
  const method = options.method || 'GET';
  calls.push({ url, method });
  const u = new URL(url, 'http://x');
  const id = u.pathname.split('/')[3];
  if (method === 'DELETE') {
    if (failDelete) return json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } }, false, 404);
    rows = rows.filter((r) => r._id !== id);
    return { ok: true, status: 204, json: async () => { throw new SyntaxError('no body'); } };
  }
  if (method === 'PATCH') {
    const row = rows.find((r) => r._id === id);
    row.status = JSON.parse(options.body).status;
    row.updatedAt = '2030-06-01T09:00:00Z';
    return json({ data: { ...row } });
  }
  const status = u.searchParams.get('status');
  const counts = { All: rows.length, Pending: 0, Confirmed: 0, Cancelled: 0 };
  rows.forEach((r) => { counts[r.status] += 1; });
  const data = rows.filter((r) => !status || r.status === status).map((r) => ({ ...r }));
  return json({ data, meta: { total: data.length, counts } });
}

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const openDetails = (name) => fireEvent.click(screen.getByRole('button', { name: `View details for ${name}` }));
const dialog = () => screen.getByRole('dialog');

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/');
  rows = [
    { _id: 'a1', customerName: 'Ankit Singh', service: 'Software Engineering', scheduledAt: '2030-01-01T10:00:00Z', status: 'Pending', createdAt: '2029-12-01T08:00:00Z', updatedAt: '2029-12-01T08:00:00Z' },
    { _id: 'j1', customerName: 'Jamie Lee', service: 'Follow-up', scheduledAt: '2030-01-02T10:00:00Z', status: 'Pending', createdAt: '2029-12-02T08:00:00Z', updatedAt: '2029-12-02T08:00:00Z' },
  ];
  calls = [];
  failDelete = false;
  vi.stubGlobal('fetch', vi.fn(async (url, options) => handle(url, options)));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});

describe('appointment details modal', () => {
  it('opens from the row with the appointment details', async () => {
    render(<App />);
    await flush();
    openDetails('Ankit Singh');

    const d = dialog();
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(within(d).getByRole('heading', { name: 'Ankit Singh' })).toBeInTheDocument();
    expect(d).toHaveAccessibleName('Ankit Singh');
    expect(within(d).getByText('Software Engineering')).toBeInTheDocument();
    expect(within(d).getByRole('combobox', { name: 'Status for Ankit Singh' })).toHaveValue('Pending');
    expect(within(d).getByText('Created')).toBeInTheDocument();
    expect(within(d).queryByText('Last updated')).not.toBeInTheDocument(); // never edited
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(d).getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it.each([
    ['the Close button', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['a click on the backdrop', () => fireEvent.mouseDown(document.querySelector('.modal-backdrop'))],
  ])('closes with %s and returns focus to the row', async (_label, close) => {
    render(<App />);
    await flush();
    const trigger = screen.getByRole('button', { name: 'View details for Ankit Singh' });
    trigger.focus();
    fireEvent.click(trigger);
    close();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not close when clicking inside the panel', async () => {
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.mouseDown(dialog());
    expect(dialog()).toBeInTheDocument();
  });

  it('keeps Tab focus inside the dialog', async () => {
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    const buttons = within(dialog()).getAllByRole('button');
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(within(dialog()).getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('changes status from the modal and keeps it open with the new value', async () => {
    window.history.replaceState(null, '', '/?status=Pending');
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.change(within(dialog()).getByRole('combobox'), { target: { value: 'Confirmed' } });
    await flush();

    expect(calls.some((c) => c.method === 'PATCH' && c.url === '/api/appointments/a1')).toBe(true);
    expect(within(dialog()).getByRole('combobox')).toHaveValue('Confirmed');
    expect(within(dialog()).getByText('Last updated')).toBeInTheDocument();
    // It left the Pending list behind the modal, and the notice says so.
    expect(screen.queryByRole('button', { name: 'View details for Ankit Singh' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('moved from Pending to the Confirmed tab');
  });
});

describe('deleting an appointment', () => {
  it('asks for confirmation, can be cancelled, and deletes nothing', async () => {
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete appointment' }));

    expect(within(dialog()).getByText('Delete this appointment? This can’t be undone.')).toBeInTheDocument();
    const cancel = within(dialog()).getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    expect(within(dialog()).getByRole('button', { name: 'Delete appointment' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('deletes after confirming, closes the modal, refreshes the list and counts', async () => {
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete appointment' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete permanently' }));
    await flush();

    expect(calls.filter((c) => c.method === 'DELETE')).toEqual([{ url: '/api/appointments/a1', method: 'DELETE' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View details for Ankit Singh' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('All1');
    expect(screen.getByRole('status')).toHaveTextContent('Deleted the appointment for Ankit Singh.');
    // The row that opened the modal is gone, so focus goes to the search box.
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('keeps the modal open with the error when the delete fails', async () => {
    failDelete = true;
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete appointment' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete permanently' }));
    await flush();

    expect(within(dialog()).getByRole('alert')).toHaveTextContent('Appointment not found.');
    expect(within(dialog()).getByRole('button', { name: 'Delete permanently' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'View details for Ankit Singh' })).toBeInTheDocument();
  });

  it('cannot be closed while the delete is in flight', async () => {
    let release;
    vi.stubGlobal('fetch', vi.fn((url, options) =>
      options?.method === 'DELETE'
        ? new Promise((r) => { release = () => r(handle(url, options)); })
        : Promise.resolve(handle(url, options))
    ));
    render(<App />);
    await flush();
    openDetails('Ankit Singh');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete appointment' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete permanently' }));

    expect(within(dialog()).getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog()).toBeInTheDocument();
    await act(async () => release());
    await flush();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
