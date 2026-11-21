import mongoose from 'mongoose';
import { log } from '../utils/logger.js';

let connectionPromise;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in the environment.');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI)
      .then(() => {
        log('info', 'mongodb_connected', {
          database: mongoose.connection.name,
          host: mongoose.connection.host
        });
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        log('error', 'mongodb_connection_failed', { message: error.message });
        throw error;
      });
  }

  return connectionPromise;
}
