import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true;
app.use(cors({ origin: allowedOrigins }));

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

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'EventEase API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`EventEase API running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start EventEase:', error.message);
    process.exit(1);
  }
}

startServer();
