import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required. Send a Bearer token.', 401);
  }
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET is not configured on the server.', 500);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired. Please log in again.', 401);
    }
    throw new AppError('Invalid authentication token.', 401);
  }

  const user = await User.findById(decoded.id).select('_id name email role');
  if (!user) throw new AppError('The user for this token no longer exists.', 401);

  req.user = user;
  next();
});

export default protect;
