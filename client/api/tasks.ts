import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ActivityTask, ApiResponse, LectureRecord, User } from '../../shared/src/types.js';
import { getUserFromRequest } from '../../server/src/auth/auth.service.js';
import {
  createActivityTask,
  createLecture,
  deleteActivityTask,
  deleteLecture,
  listActivityTasks,
  listLectures,
  parseCreateActivityTaskRequest,
  parseCreateLectureRequest,
  updateActivityTask,
  updateLecture,
} from '../../server/src/content/content.service.js';

function sendError(res: VercelResponse, status: number, error: string): void {
  res.status(status).json({ success: false, data: null, error });
}

async function handleContentApi(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }

  if (req.query.content === 'lectures' && req.method === 'GET') {
    const body: ApiResponse<LectureRecord[]> = { success: true, data: await listLectures(user as User) };
    res.status(200).json(body);
    return;
  }

  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    sendError(res, 405, `Method ${req.method} not allowed.`);
    return;
  }
  if (user.role !== 'TEACHER') {
    sendError(res, 403, 'Your account is not allowed to do that.');
    return;
  }

  // Edit or delete one item: PUT/DELETE /api/content/lectures/:id or /api/content/tasks/:id.
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      sendError(res, 400, 'Say which item to change.');
      return;
    }
    if (req.query.content === 'lectures') {
      if (req.method === 'DELETE') {
        const result = await deleteLecture(id);
        if ('error' in result) { sendError(res, result.status, result.error); return; }
        res.status(200).json({ success: true, data: result.data });
        return;
      }
      const request = parseCreateLectureRequest(req.body);
      if (!request) { sendError(res, 400, 'Provide the word, translation, phonetic guide, category, and cultural note.'); return; }
      const result = await updateLecture(id, request);
      if ('error' in result) { sendError(res, result.status, result.error); return; }
      const body: ApiResponse<LectureRecord> = { success: true, data: result.data };
      res.status(200).json(body);
      return;
    }
    if (req.query.content === 'tasks') {
      if (req.method === 'DELETE') {
        const result = await deleteActivityTask(id);
        if ('error' in result) { sendError(res, result.status, result.error); return; }
        res.status(200).json({ success: true, data: result.data });
        return;
      }
      const request = parseCreateActivityTaskRequest(req.body);
      if (!request) { sendError(res, 400, 'Provide a title, type, instructions, points, and valid due date.'); return; }
      const { type: _type, ...fields } = request;
      const result = await updateActivityTask(id, fields);
      if ('error' in result) { sendError(res, result.status, result.error); return; }
      const body: ApiResponse<ActivityTask> = { success: true, data: result.data };
      res.status(200).json(body);
      return;
    }
    sendError(res, 404, 'No content endpoint matches this request.');
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

  const user = await getUserFromRequest(req);
  if (!user) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, `Method ${req.method} not allowed.`);
    return;
  }
  const body: ApiResponse<ActivityTask[]> = { success: true, data: await listActivityTasks(user as User) };
  res.status(200).json(body);
}
