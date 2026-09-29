import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, StudentAccount } from '../../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../../server/src/auth/auth.service.js';
import { editStudent, parseUpdateStudentRequest } from '../../../../server/src/admin/students.service.js';

// Vercel equivalent of PUT /api/admin/students/:id in server/src/routes/admin.routes.ts.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
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
  const patch = parseUpdateStudentRequest(req.body);
  if (!patch) {
    res.status(400).json({ success: false, data: null, error: 'Send at least one field to update.' });
    return;
  }

  const result = await editStudent(id, patch);
  if (!result.ok) {
    res.status(result.status).json({ success: false, data: null, error: result.error });
    return;
  }

  const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
  res.status(200).json(body);
}
