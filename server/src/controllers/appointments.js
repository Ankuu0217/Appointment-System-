import Appointment from '../models/Appointment.js';
import { listAppointments } from '../services/appointmentService.js';

export async function list(req, res, next) {
  try {
    res.json(await listAppointments(req.valid.query));
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const appointment = await Appointment.create(req.valid.body);
    res.status(201).json({ data: appointment });
  } catch (err) { next(err); }
}
