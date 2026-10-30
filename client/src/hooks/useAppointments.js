import { useCallback, useEffect, useState } from 'react';
import { getAppointments } from '../api/appointments.js';

const EMPTY_COUNTS = { All: 0, Pending: 0, Confirmed: 0, Cancelled: 0 };

export default function useAppointments(statusFilter, search) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: null, data: [], counts: EMPTY_COUNTS, error: null });
  const key = `${statusFilter}|${search}|${reloads}`;

  useEffect(() => {
    // Aborting on cleanup cancels the stale request; `stale` is the request-id guard.
    const controller = new AbortController();
    let stale = false;

    getAppointments({ status: statusFilter, search, signal: controller.signal })
      .then((res) => {
        if (!stale) setResult({ key, data: res.data, counts: res.meta.counts, error: null });
      })
      .catch((err) => {
        if (stale || err.name === 'AbortError') return;
        setResult((r) => ({ ...r, key, error: err.message }));
      });

    return () => {
      stale = true;
      controller.abort();
    };
  }, [key, statusFilter, search]);

  const refetch = useCallback(() => setReloads((n) => n + 1), []);

  return { data: result.data, counts: result.counts, error: result.error, loading: result.key !== key, refetch };
}
