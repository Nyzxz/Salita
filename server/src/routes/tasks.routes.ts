import { Router } from 'express';
import type { ApiResponse, ActivityTask } from '../../../shared/src/types.js';
import { TASKS } from '../data/tasks.data.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const tasksRouter = Router();

/** GET /api/tasks — any signed-in user (student or teacher) can view the list. */
tasksRouter.get('/', requireAuth(), (_req, res) => {
  const body: ApiResponse<ActivityTask[]> = { success: true, data: TASKS };
  res.json(body);
});
