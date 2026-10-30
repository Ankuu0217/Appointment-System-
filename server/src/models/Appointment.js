import mongoose from 'mongoose';

export const STATUSES = ['Pending', 'Confirmed', 'Cancelled'];

const appointmentSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    service: { type: String, required: true, trim: true, maxlength: 100 },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: 'Pending' },
  },
  { timestamps: true }
);

appointmentSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model('Appointment', appointmentSchema);
