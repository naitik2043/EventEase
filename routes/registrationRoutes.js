import { Router } from 'express';
import { body, param } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import restrictToAdmin from '../middleware/adminMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  createRegistration,
  getMyRegistrations,
  getRegistrationsForEvent,
  cancelRegistration
} from '../controllers/registrationController.js';

const router = Router();
router.use(protect);

router.post('/', [
  body('eventId').isMongoId().withMessage('A valid eventId is required.'),
  body('numberOfSeats').isInt({ min: 1 }).toInt().withMessage('numberOfSeats must be a positive whole number.')
], validateRequest, createRegistration);

router.get('/my', getMyRegistrations);
router.get('/event/:eventId', restrictToAdmin, param('eventId').isMongoId().withMessage('Invalid event ID.'), validateRequest, getRegistrationsForEvent);
router.patch('/:id/cancel', param('id').isMongoId().withMessage('Invalid registration ID.'), validateRequest, cancelRegistration);

export default router;
