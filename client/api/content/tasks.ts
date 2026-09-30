import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ActivityTask, ApiResponse, User } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { createActivityTask, parseCreateActivityTaskRequest } from '../../../server/src/content/content.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
    return;
  }
  if (user.role !== 'TEACHER') {
    res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
    return;
  }
  const request = parseCreateActivityTaskRequest(req.body);
  if (!request) {
    res.status(400).json({ success: false, data: null, error: 'Provide a title, type, instructions, points, and valid due date.' });
    return;
  }
  const body: ApiResponse<ActivityTask> = { success: true, data: await createActivityTask(user as User, request) };
  res.status(201).json(body);
}