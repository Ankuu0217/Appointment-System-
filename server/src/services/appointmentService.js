import Appointment, { STATUSES } from '../models/Appointment.js';
import escapeRegex from '../utils/escapeRegex.js';

// Filter shared by the list query and the counts aggregation (search only, never status).
export function buildAppointmentFilter({ search } = {}) {
  const filter = {};
  if (search) {
    filter.customerName = { $regex: escapeRegex(search), $options: 'i' };
  }
  return filter;
}

export async function listAppointments({ status, search }) {
  const baseFilter = buildAppointmentFilter({ search });
  const listFilter = status ? { ...baseFilter, status } : baseFilter;

  const [data, grouped] = await Promise.all([
    Appointment.find(listFilter).sort({ scheduledAt: 1 }).lean(),
    Appointment.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const counts = { All: 0 };
  STATUSES.forEach((s) => { counts[s] = 0; });
  grouped.forEach(({ _id, count }) => { counts[_id] = count; counts.All += count; });

  return { data, meta: { total: data.length, counts } };
}
