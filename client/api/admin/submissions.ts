import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, SubmissionRecord } from '../../../shared/src/types.js';
import { getUserFromRequest } from '../../../server/src/auth/auth.service.js';
import { parsePageRequest, queryString } from '../../../server/src/pagination.js';
import { getAllSubmissions } from '../../../server/src/submissions/submissions.service.js';

// Vercel equivalent of GET /api/admin/submissions in server/src/routes/admin.routes.ts.
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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
    return;
  }

  const paging = parsePageRequest(req.query);
  const status = queryString(req.query, 'status');
  const taskType = queryString(req.query, 'taskType');
  const { items, total } = await getAllSubmissions({
    skip: paging.skip,
    limit: paging.limit,
    ...(status === 'PENDING' || status === 'GRADED' ? { status } : {}),
    ...(taskType === 'ACTIVITY' || taskType === 'PERFORMANCE_TASK' ? { taskType } : {}),
    taskId: queryString(req.query, 'taskId', 60),
  });
  const body: ApiResponse<SubmissionRecord[]> = {
    success: true,
    data: items,
    meta: { total, page: paging.page, limit: paging.limit },
  };
  res.status(200).json(body);
}
