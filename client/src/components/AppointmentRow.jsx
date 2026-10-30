import StatusSelect from './StatusSelect.jsx';
import { formatDateTime } from '../utils/format.js';

export default function AppointmentRow({ appointment, onStatusChanged, onOpen }) {
  const { customerName, service, scheduledAt } = appointment;
  return (
    <li className="row">
      <button
        type="button"
        className="row-main"
        onClick={() => onOpen(appointment)}
        aria-haspopup="dialog"
        aria-label={`View details for ${customerName}`}
      >
        <span className="row-name">{customerName}</span>
        <span className="row-meta">{service} · {formatDateTime(scheduledAt)}</span>
      </button>
      <div className="row-status">
        <StatusSelect appointment={appointment} onStatusChanged={onStatusChanged} />
      </div>
    </li>
  );
}
