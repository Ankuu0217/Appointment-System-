import { useState } from 'react';
import useAppointments from './hooks/useAppointments.js';
import useDebouncedValue from './hooks/useDebouncedValue.js';
import useListParams from './hooks/useListParams.js';
import StatusFilter from './components/StatusFilter.jsx';
import SearchInput from './components/SearchInput.jsx';
import AppointmentList from './components/AppointmentList.jsx';
import AddAppointmentForm from './components/AddAppointmentForm.jsx';
import AppointmentModal from './components/AppointmentModal.jsx';
import useNotice from './hooks/useNotice.js';

export default function App() {
  const { status, setStatus, initialSearch, syncSearch } = useListParams();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debounced = useDebouncedValue(searchInput, 300);
  // Clearing applies immediately; typing waits for the debounce.
  const search = (searchInput.trim() === '' ? '' : debounced).trim();

  const { data, counts, loading, error, refetch } = useAppointments(status, search);

  // Keep the URL in step with the applied search.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (syncedSearch !== search) {
    setSyncedSearch(search);
    syncSearch(search);
  }

  const [notice, showNotice] = useNotice();
  // The appointment shown in the details modal (kept as an object so it survives leaving the filtered list).
  const [selected, setSelected] = useState(null);

  const clearSearch = () => setSearchInput('');

  // Refetch so the tab counts update, and the row leaves the list if it no longer matches the filter.
  function handleStatusChanged(updated, previous) {
    const leavesView = status !== 'All' && updated.status !== status;
    showNotice(
      `${updated.customerName} marked ${updated.status}` +
        (leavesView ? ` (moved from ${previous} to the ${updated.status} tab).` : '.')
    );
    refetch();
  }

  function handleModalStatusChanged(updated, previous) {
    setSelected(updated);
    handleStatusChanged(updated, previous);
  }

  function handleDeleted(deleted) {
    setSelected(null);
    showNotice(`Deleted the appointment for ${deleted.customerName}.`);
    refetch();
  }

  function handleCreated(created) {
    const hiddenByStatus = status !== 'All' && created.status !== status;
    const hiddenBySearch = search && !created.customerName.toLowerCase().includes(search.toLowerCase());
    if (hiddenByStatus) setStatus('All');
    if (hiddenBySearch) setSearchInput('');
    if (!hiddenByStatus && !hiddenBySearch) refetch();
  }

  let body;
  if (error) {
    body = <p role="alert" className="empty">{error}</p>;
  } else if (loading && data.length === 0) {
    body = <p className="empty">Loading…</p>;
  } else if (data.length === 0 && search) {
    body = (
      <div className="empty">
        <p>{`No appointments match "${search}".`}</p>
        <button type="button" className="btn-outline" onClick={clearSearch}>Clear search</button>
      </div>
    );
  } else if (data.length === 0 && status !== 'All') {
    body = <p className="empty">No {status.toLowerCase()} appointments.</p>;
  } else if (data.length === 0) {
    body = <p className="empty">No appointments yet.</p>;
  } else {
    body = <AppointmentList items={data} onStatusChanged={handleStatusChanged} onOpen={setSelected} />;
  }

  return (
    <main className="page">
      <header className="header">
        <p className="label">Schedule</p>
        <h1>Appointments</h1>
      </header>

      <AddAppointmentForm onCreated={handleCreated} />

      <div className="toolbar">
        <SearchInput value={searchInput} onChange={setSearchInput} onClear={clearSearch} />
        <StatusFilter value={status} counts={counts} onChange={setStatus} />
      </div>

      <p className="notice" role="status">{notice}</p>

      {!error && !loading && (
        <p className="summary" aria-live="polite">
          {search
            ? `Showing ${data.length} of ${counts.All} appointments matching "${search}"`
            : `Showing ${data.length} of ${counts.All} appointments`}
        </p>
      )}

      {body}

      {selected && (
        <AppointmentModal
          key={selected._id}
          appointment={selected}
          onClose={() => setSelected(null)}
          onStatusChanged={handleModalStatusChanged}
          onDeleted={handleDeleted}
        />
      )}
    </main>
  );
}
