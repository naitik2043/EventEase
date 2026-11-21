import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import app from './app.js';
import { connectDB } from './config/db.js';
import { assertProductionEnvironment } from './config/runtime.js';
import { log } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 5000;

export async function startServer() {
  assertProductionEnvironment();
  await connectDB();

  const server = app.listen(PORT, () => {
    log('info', 'server_started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    log('info', 'shutdown_started', { signal });

    const forceExitTimer = setTimeout(() => {
      log('error', 'shutdown_timeout', { timeoutMs: 10000 });
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    server.close(async (serverError) => {
      clearTimeout(forceExitTimer);
      try {
        await mongoose.disconnect();
        if (serverError) throw serverError;
        log('info', 'shutdown_completed', { signal });
        process.exitCode = 0;
      } catch (error) {
        log('error', 'shutdown_failed', {
          message: error.message,
          stack: error.stack
        });
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer().catch((error) => {
    log('error', 'startup_failed', {
      message: error.message,
      stack: error.stack
    });
    process.exitCode = 1;
  });
}
