const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function AppointmentList({ items }) {
  return (
    <ul className="list">
      {items.map((a) => (
        <li key={a._id} className="row">
          <div>
            <p className="row-name">{a.customerName}</p>
            <p className="row-meta">{a.service} · {fmt.format(new Date(a.scheduledAt))}</p>
          </div>
          <span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span>
        </li>
      ))}
    </ul>
  );
}
