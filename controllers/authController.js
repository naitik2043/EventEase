import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET is not configured on the server.', 500);
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('An account with this email already exists.', 409);

  // Public registration always creates a normal User; clients cannot assign themselves Admin.
  const user = await User.create({ name, email, password, role: 'User' });
  const token = createToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = createToken(user._id);
  res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});
