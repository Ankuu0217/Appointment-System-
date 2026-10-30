import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import StatusSelect from './StatusSelect.jsx';
import { deleteAppointment } from '../api/appointments.js';
import { formatDateTime, formatFullDateTime } from '../utils/format.js';

export default function AppointmentModal({ appointment, onClose, onStatusChanged, onDeleted }) {
  const { _id: id, customerName, service, scheduledAt, createdAt, updatedAt } = appointment;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const returnFocusRef = useRef(null);

  async function confirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteAppointment(id);
      // The row that opened this modal is about to disappear, so send focus to the search box instead.
      returnFocusRef.current = document.querySelector('#appointment-search');
      onDeleted(appointment);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <Modal
      title={customerName}
      onClose={deleting ? () => {} : onClose}
      fallbackFocus="#appointment-search"
      getReturnFocus={() => returnFocusRef.current}
    >
      <dl className="details">
        <div>
          <dt>Service</dt>
          <dd>{service}</dd>
        </div>
        <div>
          <dt>Date and time</dt>
          <dd>{formatFullDateTime(scheduledAt)}</dd>
        </div>
        <div>
          <dt><label htmlFor="modal-status">Status</label></dt>
          <dd><StatusSelect id="modal-status" appointment={appointment} onStatusChanged={onStatusChanged} /></dd>
        </div>
        {createdAt && (
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(createdAt)}</dd>
          </div>
        )}
        {updatedAt && updatedAt !== createdAt && (
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(updatedAt)}</dd>
          </div>
        )}
      </dl>

      <div className="modal-footer">
        {confirming ? (
          <div className="confirm" role="group" aria-label="Confirm delete">
            <p>Delete this appointment? This can’t be undone.</p>
            <div className="confirm-actions">
              {/* Focus the safe choice first. */}
              <button type="button" className="btn-outline" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-danger-outline" onClick={() => setConfirming(true)}>
            Delete appointment
          </button>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
      </div>
    </Modal>
  );
}
