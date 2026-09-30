import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, QuizContent, User } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { createQuiz, listQuizzes, parseCreateQuizRequest } from '../../../server/src/quizzes/quizzes.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (req.method === 'GET') {
    const body: ApiResponse<QuizContent[]> = { success: true, data: await listQuizzes() };
    res.status(200).json(body);
    return;
  }
  if (req.method === 'POST') {
    if (user.role !== 'TEACHER') {
      res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
      return;
    }
    const request = parseCreateQuizRequest(req.body);
    if (!request) {
      res.status(400).json({ success: false, data: null, error: 'Provide a title, description, and valid multiple-choice questions.' });
      return;
    }
    const body: ApiResponse<QuizContent> = { success: true, data: await createQuiz(user as User, request) };
    res.status(201).json(body);
    return;
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
}