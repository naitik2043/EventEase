import { Router } from 'express';
import { body, param, query } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import restrictToAdmin from '../middleware/adminMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  createEvent,
  getUpcomingEvents,
  getEventById,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';

const router = Router();

const createEventValidation = [
  body('eventName').trim().isLength({ min: 3, max: 120 }).withMessage('Event name must be 3 to 120 characters.'),
  body('description').optional().isString().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('category').trim().isLength({ min: 2, max: 60 }).withMessage('Category must be 2 to 60 characters.'),
  body('eventDate').isISO8601().withMessage('eventDate must be a valid ISO date.'),
  body('venue').trim().isLength({ min: 2, max: 200 }).withMessage('Venue must be 2 to 200 characters.'),
  body('totalSeats').isInt({ min: 1, max: 100000 }).toInt().withMessage('totalSeats must be a positive whole number.'),
  body('registrationFee').isFloat({ min: 0 }).toFloat().withMessage('registrationFee must be zero or more.')
];

const updateEventValidation = [
  body('eventName').optional().trim().isLength({ min: 3, max: 120 }).withMessage('Event name must be 3 to 120 characters.'),
  body('description').optional().isString().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('category').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Category must be 2 to 60 characters.'),
  body('eventDate').optional().isISO8601().withMessage('eventDate must be a valid ISO date.'),
  body('venue').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Venue must be 2 to 200 characters.'),
  body('totalSeats').optional().isInt({ min: 1, max: 100000 }).toInt().withMessage('totalSeats must be a positive whole number.'),
  body('registrationFee').optional().isFloat({ min: 0 }).toFloat().withMessage('registrationFee must be zero or more.'),
  body('availableSeats').not().exists().withMessage('availableSeats is calculated by the server and cannot be edited directly.'),
  body('createdBy').not().exists().withMessage('createdBy is assigned by the server.')
];

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('category').optional().isString().trim().isLength({ max: 60 })
], validateRequest, getUpcomingEvents);

router.get('/:id', param('id').isMongoId().withMessage('Invalid event ID.'), validateRequest, getEventById);
router.post('/', protect, restrictToAdmin, createEventValidation, validateRequest, createEvent);
router.put('/:id', protect, restrictToAdmin, param('id').isMongoId(), updateEventValidation, validateRequest, updateEvent);
router.delete('/:id', protect, restrictToAdmin, param('id').isMongoId(), validateRequest, deleteEvent);

export default router;
