import { Router } from 'express';
import type { ApiResponse, QuizQuestion } from '../../../shared/src/types.js';
import { QUIZ_QUESTIONS } from '../data/quiz.data.js';
import { ApiError } from '../middleware/errorHandler.js';

export const quizRouter = Router();

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * GET /api/quiz
 * GET /api/quiz?count=5 — a random subset, for a shorter round.
 */
quizRouter.get('/', (req, res, next) => {
  try {
    const { count } = req.query;

    if (count === undefined) {
      const body: ApiResponse<QuizQuestion[]> = { success: true, data: QUIZ_QUESTIONS };
      res.json(body);
      return;
    }

    const parsed = Number(count);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ApiError(400, `"count" must be a positive integer, received "${String(count)}".`);
    }

    const data = shuffled(QUIZ_QUESTIONS).slice(0, Math.min(parsed, QUIZ_QUESTIONS.length));
    const body: ApiResponse<QuizQuestion[]> = { success: true, data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
