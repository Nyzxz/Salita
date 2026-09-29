import { Router } from 'express';
import type { ApiResponse, SubmissionRecord, User } from '../../../shared/src/types.js';
import { getMySubmissions, parseCreateSubmissionRequest, submitWork } from '../submissions/submissions.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const submissionsRouter = Router();

// Submitting/viewing "my" work is a student action.
submissionsRouter.use(requireAuth('STUDENT'));

/** GET /api/submissions/me */
submissionsRouter.get('/me', (_req, res, next) => {
  const user = res.locals.user as User;
  void getMySubmissions(user)
    .then((submissions) => {
      const body: ApiResponse<SubmissionRecord[]> = { success: true, data: submissions };
      res.json(body);
    })
    .catch(next);
});

/** POST /api/submissions  { taskId, content } — creates or resubmits. */
submissionsRouter.post('/', async (req, res, next) => {
  try {
    const request = parseCreateSubmissionRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Choose a task and write a submission before sending.');
    }
    const user = res.locals.user as User;
    const result = await submitWork(user, request);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});
