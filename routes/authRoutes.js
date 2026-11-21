import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { register, login } from '../controllers/authController.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again later.' }
});

const validateRegister = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters.')
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.')
];

router.post('/register', authLimiter, validateRegister, validateRequest, register);
router.post('/login', authLimiter, validateLogin, validateRequest, login);

export default router;
