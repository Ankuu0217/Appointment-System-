import { useState } from 'react';
import { updateAppointmentStatus } from '../api/appointments.js';
import { STATUSES } from '../hooks/useListParams.js';

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const OPTIONS = STATUSES.filter((s) => s !== 'All');

export default function AppointmentRow({ appointment, onStatusChanged }) {
  const { _id: id, customerName, service, scheduledAt, status } = appointment;
  // The chosen value shows immediately; it's dropped once the server's value arrives (or on failure).
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seenStatus, setSeenStatus] = useState(status);
  if (seenStatus !== status) {
    setSeenStatus(status);
    setPending(null);
  }

  const shown = pending ?? status;

  async function change(e) {
    const next = e.target.value;
    if (next === shown) return;
    setPending(next);
    setSaving(true);
    setError('');
    try {
      const { data } = await updateAppointmentStatus(id, next);
      onStatusChanged(data, status);
    } catch (err) {
      setPending(null);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="row">
      <div>
        <p className="row-name">{customerName}</p>
        <p className="row-meta">{service} · {fmt.format(new Date(scheduledAt))}</p>
        {error && <p role="alert" className="row-error">{error}</p>}
      </div>
      <div className="row-status">
        <select
          className={`status status-select status-${shown.toLowerCase()}`}
          value={shown}
          onChange={change}
          disabled={saving}
          aria-label={`Status for ${customerName}`}
          aria-busy={saving}
        >
          {OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </li>
  );
}
