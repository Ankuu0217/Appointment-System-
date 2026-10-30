export default function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="search">
      <label htmlFor="appointment-search" className="sr-only">Search by customer name</label>
      <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="appointment-search"
        type="search"
        value={value}
        maxLength={100}
        placeholder="Search customer name…"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onClear();
          }
        }}
      />
      {value && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={onClear}>
          ×
        </button>
      )}
    </div>
  );
}
