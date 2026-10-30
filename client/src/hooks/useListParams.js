import { useCallback, useState } from 'react';

export const STATUSES = ['All', 'Pending', 'Confirmed', 'Cancelled'];

function read() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  return {
    status: STATUSES.includes(status) ? status : 'All',
    search: (params.get('search') || '').slice(0, 100),
  };
}

function write(next) {
  const params = new URLSearchParams(window.location.search);
  if (next.status && next.status !== 'All') params.set('status', next.status);
  else params.delete('status');
  if (next.search) params.set('search', next.search);
  else params.delete('search');
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

// Keeps ?status= and ?search= in sync with the URL via replaceState (no history entries).
export default function useListParams() {
  const [initial] = useState(read);
  const [status, setStatusState] = useState(initial.status);

  const setStatus = useCallback((value) => {
    setStatusState(value);
    write({ ...read(), status: value });
  }, []);

  const syncSearch = useCallback((value) => {
    write({ ...read(), search: value });
  }, []);

  return { status, setStatus, initialSearch: initial.search, syncSearch };
}
