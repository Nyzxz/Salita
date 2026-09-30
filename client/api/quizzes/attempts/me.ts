import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, QuizAttemptRecord } from '../../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../../server/src/auth/auth.service.js';
import { getStudentQuizAttempts } from '../../../../server/src/quizzes/quizzes.service.js';

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
  const body: ApiResponse<QuizAttemptRecord[]> = { success: true, data: await getStudentQuizAttempts(user.id) };
  res.status(200).json(body);
}