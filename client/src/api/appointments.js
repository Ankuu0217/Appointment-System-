// Empty in development (Vite proxies /api). In production set VITE_API_BASE_URL to the API origin,
// e.g. https://appointments-api.onrender.com — it is baked in at build time.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // Network failure, CORS rejection or the API being down all surface as a TypeError.
    throw new Error('Cannot reach the API server. Please try again in a moment.');
  }
  const body = await res.json().catch(() => null);
  if (body === null) {
    // An HTML page (e.g. the SPA's index.html) came back instead of JSON: /api isn't reaching the API.
    throw new Error('The API address is misconfigured: /api returned a web page instead of data.');
  }
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
  return request(`/api/appointments${qs ? `?${qs}` : ''}`, { signal });
}

export async function createAppointment(payload) {
  return request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateAppointmentStatus(id, status) {
  return request(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
