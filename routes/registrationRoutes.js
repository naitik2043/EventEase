import { Router } from 'express';
import { body, param } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import restrictToAdmin from '../middleware/adminMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  createRegistration,
  getMyRegistrations,
  getRegistrationsForEvent,
  cancelRegistration,
  joinWaitlist,
  getMyWaitlist,
  getEventWaitlist,
  cancelWaitlistEntry,
  getRegistrationTicket,
  verifyTicket
} from '../controllers/registrationController.js';

const router = Router();
router.use(protect);

router.post('/', [
  body('eventId').isMongoId().withMessage('A valid eventId is required.'),
  body('numberOfSeats').isInt({ min: 1, max: 20 }).toInt()
    .withMessage('numberOfSeats must be between 1 and 20.')
], validateRequest, createRegistration);

router.get('/my', getMyRegistrations);
router.get('/waitlist/my', getMyWaitlist);
router.post('/waitlist', [
  body('eventId').isMongoId().withMessage('A valid eventId is required.'),
  body('numberOfSeats').isInt({ min: 1, max: 20 }).toInt()
    .withMessage('numberOfSeats must be between 1 and 20.')
], validateRequest, joinWaitlist);

router.delete(
  '/waitlist/:id',
  param('id').isMongoId().withMessage('Invalid waitlist entry ID.'),
  validateRequest,
  cancelWaitlistEntry
);

router.post('/check-in', restrictToAdmin, [
  body('ticketCode').isString().trim().isLength({ min: 32, max: 64 })
    .withMessage('A valid ticketCode is required.')
], validateRequest, verifyTicket);

router.get(
  '/event/:eventId/waitlist',
  restrictToAdmin,
  param('eventId').isMongoId().withMessage('Invalid event ID.'),
  validateRequest,
  getEventWaitlist
);
router.get(
  '/event/:eventId',
  restrictToAdmin,
  param('eventId').isMongoId().withMessage('Invalid event ID.'),
  validateRequest,
  getRegistrationsForEvent
);

router.get(
  '/:id/ticket',
  param('id').isMongoId().withMessage('Invalid registration ID.'),
  validateRequest,
  getRegistrationTicket
);
router.patch(
  '/:id/cancel',
  param('id').isMongoId().withMessage('Invalid registration ID.'),
  validateRequest,
  cancelRegistration
);

export default router;
