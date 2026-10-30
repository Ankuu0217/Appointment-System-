import { useState } from 'react';
import { createAppointment } from '../api/appointments.js';

const EMPTY = { customerName: '', service: '', scheduledAt: '' };

export default function AddAppointmentForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await createAppointment({
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '',
      });
      setForm(EMPTY);
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card add-form" onSubmit={submit} noValidate>
      <h2 className="label">New appointment</h2>
      <div className="add-fields">
        <label>
          <span>Customer name</span>
          <input value={form.customerName} onChange={set('customerName')} maxLength={100} />
        </label>
        <label>
          <span>Service</span>
          <input value={form.service} onChange={set('service')} maxLength={100} />
        </label>
        <label>
          <span>Date and time</span>
          <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} />
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>Add appointment</button>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>
  );
}
