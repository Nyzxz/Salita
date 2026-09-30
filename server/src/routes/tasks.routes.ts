import { Router } from 'express';
import type { ApiResponse, ActivityTask } from '../../../shared/src/types.js';
import { listActivityTasks } from '../content/content.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const tasksRouter = Router();

/** GET /api/tasks — any signed-in user (student or teacher) can view the list. */
tasksRouter.get('/', requireAuth(), async (_req, res, next) => {
  try {
    const body: ApiResponse<ActivityTask[]> = { success: true, data: await listActivityTasks() };
    res.json(body);
  } catch (error) {
    next(error);
  }
});
