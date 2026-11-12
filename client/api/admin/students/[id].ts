import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, StudentAccount } from '../../../../shared/src/types.js';
import { getUserFromRequest } from '../../../../server/src/auth/auth.service.js';
import { editStudent, parseUpdateStudentRequest, removeStudent } from '../../../../server/src/admin/students.service.js';

// Vercel equivalent of PUT and DELETE /api/admin/students/:id in server/src/routes/admin.routes.ts.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (user.role !== 'TEACHER') {
    res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
    return;
  }
  if (req.method === 'DELETE') {
    const studentId = typeof req.query.id === 'string' ? req.query.id : '';
    const removed = await removeStudent(studentId);
    if ('error' in removed) {
      res.status(removed.status).json({ success: false, data: null, error: removed.error });
      return;
    }
    res.status(200).json({ success: true, data: removed.data });
    return;
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT, DELETE');
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
  if ('error' in result) {
    res.status(result.status).json({ success: false, data: null, error: result.error });
    return;
  }

  const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
  res.status(200).json(body);
}
