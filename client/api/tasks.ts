import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ActivityTask, ApiResponse, LectureRecord, User } from '../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../server/src/auth/auth.service.js';
import {
  createActivityTask,
  createLecture,
  listActivityTasks,
  listLectures,
  parseCreateActivityTaskRequest,
  parseCreateLectureRequest,
} from '../../server/src/content/content.service.js';

function sendError(res: VercelResponse, status: number, error: string): void {
  res.status(status).json({ success: false, data: null, error });
}

async function handleContentApi(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }

  if (req.query.content === 'lectures' && req.method === 'GET') {
    const body: ApiResponse<LectureRecord[]> = { success: true, data: await listLectures() };
    res.status(200).json(body);
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    sendError(res, 405, `Method ${req.method} not allowed.`);
    return;
  }
  if (user.role !== 'TEACHER') {
    sendError(res, 403, 'Your account is not allowed to do that.');
    return;
  }

  if (req.query.content === 'lectures') {
    const request = parseCreateLectureRequest(req.body);
    if (!request) {
      sendError(res, 400, 'Provide the word, translation, phonetic guide, category, and cultural note.');
      return;
    }
    const body: ApiResponse<LectureRecord> = { success: true, data: await createLecture(user as User, request) };
    res.status(201).json(body);
    return;
  }

  if (req.query.content === 'tasks') {
    const request = parseCreateActivityTaskRequest(req.body);
    if (!request) {
      sendError(res, 400, 'Provide a title, type, instructions, points, and valid due date.');
      return;
    }
    const body: ApiResponse<ActivityTask> = { success: true, data: await createActivityTask(user as User, request) };
    res.status(201).json(body);
    return;
  }

  sendError(res, 404, 'No content endpoint matches this request.');
}

// Also serves /api/content/* through the rewrites in vercel.json.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.query.content !== undefined) {
    await handleContentApi(req, res);
    return;
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, `Method ${req.method} not allowed.`);
    return;
  }
  const body: ApiResponse<ActivityTask[]> = { success: true, data: await listActivityTasks() };
  res.status(200).json(body);
}
