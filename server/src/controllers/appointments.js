import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import { listAppointments } from '../services/appointmentService.js';

export async function list(req, res, next) {
  try {
    res.json(await listAppointments(req.valid.query));
  } catch (err) { next(err); }
}

const invalidId = (res) => res.status(400).json({ error: { code: 'INVALID_ID', message: 'Appointment id is not valid.' } });
const notFound = (res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });

export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return invalidId(res);
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: req.valid.body.status },
      { new: true, runValidators: true }
    );
    if (!appointment) return notFound(res);
    res.json({ data: appointment });
  } catch (err) { next(err); }
}

// Permanent delete. 204 with no body on success; deleting the same id again gives 404.
export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return invalidId(res);
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted) return notFound(res);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const appointment = await Appointment.create(req.valid.body);
    res.status(201).json({ data: appointment });
  } catch (err) { next(err); }
}
