import { Router } from 'express';
import type { ApiResponse, ActivityTask, LectureRecord, User } from '../../../shared/src/types.js';
import {
  createActivityTask,
  createLecture,
  deleteActivityTask,
  deleteLecture,
  listLectures,
  parseCreateActivityTaskRequest,
  parseCreateLectureRequest,
  updateActivityTask,
  updateLecture,
} from '../content/content.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const contentRouter = Router();

contentRouter.get('/lectures', requireAuth(), async (_req, res, next) => {
  try {
    const body: ApiResponse<LectureRecord[]> = { success: true, data: await listLectures(res.locals.user as User) };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

contentRouter.post('/lectures', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateLectureRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide the word, translation, phonetic guide, category, and cultural note.');
    const user = res.locals.user as User;
    const body: ApiResponse<LectureRecord> = { success: true, data: await createLecture(user, request) };
    res.status(201).json(body);
  } catch (error) {
    next(error);
  }
});

contentRouter.post('/tasks', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateActivityTaskRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide a title, type, instructions, points, and valid due date.');
    const user = res.locals.user as User;
    const body: ApiResponse<ActivityTask> = { success: true, data: await createActivityTask(user, request) };
    res.status(201).json(body);
  } catch (error) {
    next(error);
  }
});

contentRouter.put('/lectures/:id', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateLectureRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide the word, translation, phonetic guide, category, and cultural note.');
    const result = await updateLecture(req.params.id, request);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<LectureRecord> = { success: true, data: result.data };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

contentRouter.delete('/lectures/:id', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const result = await deleteLecture(req.params.id);
    if (!result.ok) throw new ApiError(result.status, result.error);
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

contentRouter.put('/tasks/:id', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateActivityTaskRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide a title, type, instructions, points, and valid due date.');
    const { type: _type, ...fields } = request;
    const result = await updateActivityTask(req.params.id, fields);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<ActivityTask> = { success: true, data: result.data };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

contentRouter.delete('/tasks/:id', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const result = await deleteActivityTask(req.params.id);
    if (!result.ok) throw new ApiError(result.status, result.error);
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});
