import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import requestLogger from './middleware/requestLogger.js';

const app = express();
const docsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs');

app.disable('x-powered-by');
app.use(requestLogger);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", 'https://unpkg.com'],
      styleSrc: ["'self'", 'https://unpkg.com', "'unsafe-inline'"]
    }
  }
}));

const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: configuredOrigins?.length ? configuredOrigins : true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(mongoSanitize());

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
}));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'EventEase API is running.',
    timestamp: new Date().toISOString()
  });
});

app.get('/api-docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EventEase API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script src="/api-docs/swagger-initializer.js"></script>
</body>
</html>`);
});

app.get('/api-docs/openapi.json', (_req, res) => {
  res.sendFile(path.join(docsDirectory, 'openapi.json'));
});

app.get('/api-docs/swagger-initializer.js', (_req, res) => {
  res.sendFile(path.join(docsDirectory, 'swagger-initializer.js'));
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
