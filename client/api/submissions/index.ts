import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, SubmissionRecord } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { parseCreateSubmissionRequest, submitWork } from '../../../server/src/submissions/submissions.service.js';

// Vercel equivalent of POST /api/submissions in server/src/routes/submissions.routes.ts.
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

  const request = parseCreateSubmissionRequest(req.body);
  if (!request) {
    res
      .status(400)
      .json({ success: false, data: null, error: 'Choose a task and write a submission before sending.' });
    return;
  }

  const result = submitWork(user, request);
  if ('error' in result) {
    res.status(result.status).json({ success: false, data: null, error: result.error });
    return;
  }
  const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
  res.status(201).json(body);
}
