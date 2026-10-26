import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { validateEnvOnStartup } from './config/env.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { startWorkers } from './queues/workers.js';
import { apiRateLimiter } from './middleware/rateLimitMiddleware.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { getLiveness, getReadiness } from './controllers/healthController.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import savedJobRoutes from './routes/savedJobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import { reconcilePendingReminders } from './services/interview/interviewScheduler.js';

const app = express();
const PORT = Number(process.env.PORT) || 5001;

app.set('trust proxy', 1);

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

app.get('/api/health', getLiveness);
app.get('/api/health/ready', getReadiness);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/integrations', integrationRoutes);

app.use(notFound);
app.use(errorHandler);

const bootstrap = async () => {
  validateEnvOnStartup();

  await connectDB();
  await connectRedis();
  await startWorkers();
  await reconcilePendingReminders();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareerPilot server running on port ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
