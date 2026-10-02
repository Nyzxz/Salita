import cors from 'cors';
import rateLimit from 'express-rate-limit';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { submissionsRouter } from './routes/submissions.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { milestonesRouter } from './routes/milestones.routes.js';
import { quizRouter } from './routes/quiz.routes.js';
import { quizzesRouter } from './routes/quizzes.routes.js';
import { contentRouter } from './routes/content.routes.js';
import { wordsRouter } from './routes/words.routes.js';

export function createApp(): Express {
  const app = express();
  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    ...configuredOrigins,
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
  ]);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.has(origin));
      },
      methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { success: false, data: null, error: 'Too many requests. Please try again later.' },
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        app: 'Salita API',
        status: 'ok',
        docs: '/api/health',
      },
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/words', wordsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/quiz', quizRouter);
  app.use('/api/quizzes', quizzesRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/submissions', submissionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
