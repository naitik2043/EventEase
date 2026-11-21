import AppError from '../utils/AppError.js';

/** Must be used after the authentication middleware. */
export default function restrictToAdmin(req, res, next) {
  if (!req.user) return next(new AppError('Authentication required.', 401));
  if (req.user.role !== 'Admin') {
    return next(new AppError('Admin access is required for this operation.', 403));
  }
  next();
}
