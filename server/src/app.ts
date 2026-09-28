import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { milestonesRouter } from './routes/milestones.routes.js';
import { quizRouter } from './routes/quiz.routes.js';
import { wordsRouter } from './routes/words.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/words', wordsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/quiz', quizRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
