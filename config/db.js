import mongoose from 'mongoose';
import { log } from '../utils/logger.js';

export async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    log('info', 'mongodb_connected', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
  } catch (error) {
    log('error', 'mongodb_connection_failed', {
      message: error.message
    });
    throw error;
  }
}
