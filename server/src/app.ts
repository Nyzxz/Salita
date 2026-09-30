import cors from 'cors';
import express, { type Express } from 'express';
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

  app.use(cors());
  app.use(express.json());

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
