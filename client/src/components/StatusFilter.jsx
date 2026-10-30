import { STATUSES } from '../hooks/useListParams.js';

export default function StatusFilter({ value, counts, onChange }) {
  return (
    <div className="tabs" role="group" aria-label="Filter by status">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          className="tab"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          {s}
          <span className="tab-count">{counts[s] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
