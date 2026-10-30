import Appointment from '../models/Appointment.js';

const DAY = 24 * 60 * 60 * 1000;

// Inserts the three demo appointments only when the collection is empty. Returns how many were added.
export default async function seedIfEmpty() {
  if (await Appointment.countDocuments()) return 0;
  const docs = await Appointment.create([
    { customerName: 'Alex Morgan', service: 'Haircut', scheduledAt: new Date(Date.now() + DAY), status: 'Pending' },
    { customerName: 'Taylor Smith', service: 'Consultation', scheduledAt: new Date(Date.now() + 2 * DAY), status: 'Cancelled' },
    { customerName: 'Jamie Lee', service: 'Massage', scheduledAt: new Date(Date.now() + 3 * DAY), status: 'Confirmed' },
  ]);
  return docs.length;
}
