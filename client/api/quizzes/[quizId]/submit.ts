import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, QuizAttemptRecord } from '../../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../../server/src/auth/auth.service.js';
import { parseSubmitQuizAttemptRequest, submitQuizAttempt } from '../../../../server/src/quizzes/quizzes.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (user.role !== 'STUDENT') {
    res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
    return;
  }
  const request = parseSubmitQuizAttemptRequest(req.body);
  if (!request) {
    res.status(400).json({ success: false, data: null, error: 'Submit one selected answer for each question.' });
    return;
  }
  const quizId = String(req.query.quizId ?? '');
  const attempt = await submitQuizAttempt(user, quizId, request);
  if (!attempt) {
    res.status(400).json({ success: false, data: null, error: 'The quiz was not found or the answers do not match its questions.' });
    return;
  }
  const body: ApiResponse<QuizAttemptRecord> = { success: true, data: attempt };
  res.status(201).json(body);
}