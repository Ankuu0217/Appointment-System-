import { Router } from 'express';
import validate from '../middleware/validate.js';
import { listQuerySchema, createAppointmentSchema, updateStatusSchema } from '../validators/appointment.js';
import * as controller from '../controllers/appointments.js';

const router = Router();

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.post('/', validate(createAppointmentSchema, 'body'), controller.create);
router.patch('/:id', validate(updateStatusSchema, 'body'), controller.updateStatus);

export default router;
