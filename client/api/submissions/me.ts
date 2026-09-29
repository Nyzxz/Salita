import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, SubmissionRecord } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { getMySubmissions } from '../../../server/src/submissions/submissions.service.js';

// Vercel equivalent of GET /api/submissions/me in server/src/routes/submissions.routes.ts.
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
  const body: ApiResponse<SubmissionRecord[]> = { success: true, data: getMySubmissions(user) };
  res.status(200).json(body);
}
