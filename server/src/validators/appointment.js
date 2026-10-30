import { z } from 'zod';
import { STATUSES } from '../models/Appointment.js';

export const listQuerySchema = z.object({
  status: z.enum(STATUSES, { errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}.` }) }).optional(),
  search: z
    .string({ invalid_type_error: 'Search must be text.', required_error: 'Search must be text.' })
    .trim()
    .max(100, 'Search must be at most 100 characters.')
    .optional(),
});

const statusSchema = z.enum(STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}.` }),
});

// Only the status can change through PATCH; other fields are rejected rather than silently written.
export const updateStatusSchema = z
  .object({ status: statusSchema }, { invalid_type_error: 'Request body must be a JSON object.' })
  .strict('Only "status" can be updated.');

export const createAppointmentSchema = z.object({
  customerName: z.string({ required_error: 'Customer name is required.', invalid_type_error: 'Customer name must be text.' }).trim().min(1, 'Customer name is required.').max(100, 'Customer name must be at most 100 characters.'),
  service: z.string({ required_error: 'Service is required.', invalid_type_error: 'Service must be text.' }).trim().min(1, 'Service is required.').max(100, 'Service must be at most 100 characters.'),
  // Only strings are accepted: z.coerce.date would turn null/0 into 1970-01-01.
  scheduledAt: z
    .string({ required_error: 'Scheduled time must be a valid date.', invalid_type_error: 'Scheduled time must be a valid date.' })
    .trim()
    .refine((v) => v !== '' && !Number.isNaN(Date.parse(v)), 'Scheduled time must be a valid date.')
    .transform((v) => new Date(v)),
  status: z.enum(STATUSES, { errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}.` }) }).optional(),
});
