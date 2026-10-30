import AppointmentRow from './AppointmentRow.jsx';

export default function AppointmentList({ items, onStatusChanged }) {
  return (
    <ul className="list">
      {items.map((a) => (
        <AppointmentRow key={a._id} appointment={a} onStatusChanged={onStatusChanged} />
      ))}
    </ul>
  );
}
