import { Router } from 'express';
import type { ApiResponse, AttachmentInfo, SubmissionRecord, User } from '../../../shared/src/types.js';
import {
  getMySubmissions,
  parseCreateSubmissionRequest,
  parseUploadAttachmentRequest,
  readAttachment,
  submitWork,
  uploadAttachment,
} from '../submissions/submissions.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const submissionsRouter = Router();

/** GET /api/submissions?route=attachment&id=… — download a file (its owner or any teacher). */
submissionsRouter.get('/', requireAuth(), async (req, res, next) => {
  try {
    if (req.query.route !== 'attachment') {
      next();
      return;
    }
    const file = await readAttachment(res.locals.user as User, typeof req.query.id === 'string' ? req.query.id : '');
    if (!file.ok) throw new ApiError(file.status, file.error);
    res.setHeader('Content-Type', file.data.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.data.fileName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.data.data);
  } catch (err) {
    next(err);
  }
});

// Everything below is a student action.
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

/** POST /api/submissions?route=attachment — upload a file for a task. */
submissionsRouter.post('/', async (req, res, next) => {
  try {
    if (req.query.route !== 'attachment') {
      next();
      return;
    }
    const upload = parseUploadAttachmentRequest(req.body);
    if (!upload) throw new ApiError(400, 'Choose a file to upload.');
    const result = await uploadAttachment(res.locals.user as User, upload);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<AttachmentInfo> = { success: true, data: result.data };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/submissions  { taskId, content, attachmentId? } — creates or resubmits. */
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
