import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, SubmissionRecord } from '../../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../../server/src/auth/auth.service.js';
import {
  gradeSubmission,
  parseGradeSubmissionRequest,
} from '../../../../server/src/submissions/submissions.service.js';

// Vercel equivalent of PUT /api/admin/submissions/:id in server/src/routes/admin.routes.ts.
export default function handler(req: VercelRequest, res: VercelResponse): void {
  const user = getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (user.role !== 'TEACHER') {
    res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
    return;
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const request = parseGradeSubmissionRequest(req.body);
  if (!request) {
    res.status(400).json({ success: false, data: null, error: 'Enter a valid grade and optional feedback before saving.' });
    return;
  }

  const result = gradeSubmission(id, request);
  if (!result.ok) {
    res.status(result.status).json({ success: false, data: null, error: result.error });
    return;
  }

  const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
  res.status(200).json(body);
}
