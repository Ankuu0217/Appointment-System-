import { useState } from 'react';
import { updateAppointmentStatus } from '../api/appointments.js';
import { STATUSES } from '../hooks/useListParams.js';

const OPTIONS = STATUSES.filter((s) => s !== 'All');

// Status dropdown that saves on change. Shows the chosen value immediately, locks while saving,
// and reverts with an inline error if the save fails. Used in list rows and in the details modal.
export default function StatusSelect({ appointment, onStatusChanged, id }) {
  const { _id: appointmentId, customerName, status } = appointment;
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
      const { data } = await updateAppointmentStatus(appointmentId, next);
      onStatusChanged(data, status);
    } catch (err) {
      setPending(null);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="status-control">
      <select
        id={id}
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
      {error && <p role="alert" className="row-error">{error}</p>}
    </div>
  );
}
