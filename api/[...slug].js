import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { log } from '../utils/logger.js';

/**
 * Vercel serverless adapter. The Express app stays the single HTTP routing
 * implementation for local Node.js and serverless deployments.
 */
export default async function eventEaseApi(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    log('error', 'serverless_request_start_failed', {
      message: error.message,
      databaseState: mongoose.connection.readyState
    });

    if (!res.headersSent) {
      return res.status(503).json({
        success: false,
        message: 'The API is temporarily unavailable. Check database configuration.',
        requestId: req.headers['x-vercel-id'] || undefined
      });
    }
  }
}
