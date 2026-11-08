import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, ImportStudentResult, StudentAccount } from '../../../shared/src/types.js';
import { getUserFromRequest } from '../../../server/src/auth/auth.service.js';
import {
  addStudent,
  buildGradebookCsv,
  getAllStudents,
  importStudents,
  parseCreateStudentRequest,
  parseImportStudentsRequest,
} from '../../../server/src/admin/students.service.js';
import { isGradeLevel } from '../../../server/src/grades.js';
import { parsePageRequest, queryString } from '../../../server/src/pagination.js';

// Vercel equivalent of GET/POST /api/admin/students in server/src/routes/admin.routes.ts.
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

  if (req.method === 'GET' && req.query.export === 'gradebook') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="salita-gradebook.csv"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(await buildGradebookCsv());
    return;
  }

  if (req.method === 'GET') {
    const paging = parsePageRequest(req.query);
    const section = queryString(req.query, 'section', 20);
    const status = queryString(req.query, 'status', 10);
    const { items, total } = await getAllStudents({
      skip: paging.skip,
      limit: paging.limit,
      q: queryString(req.query, 'q', 80),
      ...(section && isGradeLevel(section) ? { section } : {}),
      ...(status === 'ACTIVE' || status === 'INACTIVE' ? { status } : {}),
    });
    const body: ApiResponse<StudentAccount[]> = {
      success: true,
      data: items,
      meta: { total, page: paging.page, limit: paging.limit },
    };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST' && req.query.action === 'import') {
    const rows = parseImportStudentsRequest(req.body);
    if (!rows) {
      res.status(400).json({ success: false, data: null, error: 'Send between 1 and 10 students per import request.' });
      return;
    }
    const body: ApiResponse<ImportStudentResult[]> = { success: true, data: await importStudents(rows) };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST') {
    const request = parseCreateStudentRequest(req.body);
    if (!request) {
      res
        .status(400)
        .json({ success: false, data: null, error: 'Fill in full name, username, email, and password, and choose a grade from Grade 7 to Grade 12.' });
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
