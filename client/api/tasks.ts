import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, ActivityTask } from '../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../server/src/auth/auth.service.js';
import { TASKS } from '../../server/src/data/tasks.data.js';

// Vercel equivalent of GET /api/tasks in server/src/routes/tasks.routes.ts.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  const body: ApiResponse<ActivityTask[]> = { success: true, data: TASKS };
  res.status(200).json(body);
}
