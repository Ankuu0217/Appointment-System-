async function parse(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.error?.message || 'Request failed.');
    err.details = body?.error?.details || [];
    throw err;
  }
  return body;
}

export async function getAppointments({ status, search, signal } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.set('status', status);
  if (search) params.set('search', search);
  const qs = params.toString();
  return parse(await fetch(`/api/appointments${qs ? `?${qs}` : ''}`, { signal }));
}

export async function createAppointment(payload) {
  return parse(
    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
}
