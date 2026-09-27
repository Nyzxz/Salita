import { Router } from 'express';
import type { ApiResponse, LanguageMilestone } from '../../../shared/src/types.js';
import { MILESTONES } from '../data/milestones.data.js';

export const milestonesRouter = Router();

/** GET /api/milestones — the full language history timeline, oldest first. */
milestonesRouter.get('/', (_req, res) => {
  const body: ApiResponse<LanguageMilestone[]> = { success: true, data: MILESTONES };
  res.json(body);
});
