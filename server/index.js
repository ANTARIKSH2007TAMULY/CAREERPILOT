import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { startWorkers } from './queues/workers.js';
import { apiRateLimiter } from './middleware/rateLimitMiddleware.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import savedJobRoutes from './routes/savedJobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = Number(process.env.PORT) || 5001;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(apiRateLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);
app.use(errorHandler);

const bootstrap = async () => {
  console.log('ADZUNA_APP_ID configured:', Boolean(process.env.ADZUNA_APP_ID));
  console.log('ADZUNA_APP_KEY configured:', Boolean(process.env.ADZUNA_APP_KEY));

  await connectDB();
  await connectRedis();
  await startWorkers();

  app.listen(PORT, () => {
    console.log(`CareerPilot server running on http://localhost:${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
