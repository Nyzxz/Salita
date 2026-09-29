import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, StudentAccount } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { addStudent, getAllStudents, parseCreateStudentRequest } from '../../../server/src/admin/students.service.js';

// Vercel equivalent of GET/POST /api/admin/students in server/src/routes/admin.routes.ts.
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

  if (req.method === 'GET') {
    const body: ApiResponse<StudentAccount[]> = { success: true, data: await getAllStudents() };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST') {
    const request = parseCreateStudentRequest(req.body);
    if (!request) {
      res
        .status(400)
        .json({ success: false, data: null, error: 'Fill in full name, username, email, password, and section.' });
      return;
    }
    const result = await addStudent(request);
    if ('error' in result) {
      res.status(result.status).json({ success: false, data: null, error: result.error });
      return;
    }
    const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
    res.status(201).json(body);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
}
