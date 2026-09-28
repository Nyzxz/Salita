import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, QuizQuestion } from '../../shared/src/types.js';
import { QUIZ_QUESTIONS } from '../../server/src/data/quiz.data.js';

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const { count } = req.query;

  if (count === undefined) {
    const body: ApiResponse<QuizQuestion[]> = { success: true, data: QUIZ_QUESTIONS };
    res.status(200).json(body);
    return;
  }

  const parsed = Number(count);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: `"count" must be a positive integer, received "${String(count)}".`,
    };
    res.status(400).json(body);
    return;
  }

  const data = shuffled(QUIZ_QUESTIONS).slice(0, Math.min(parsed, QUIZ_QUESTIONS.length));
  const body: ApiResponse<QuizQuestion[]> = { success: true, data };
  res.status(200).json(body);
}
