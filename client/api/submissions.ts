import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, AttachmentInfo, SubmissionRecord } from '../../shared/src/types.js';
import { getUserFromRequest } from '../../server/src/auth/auth.service.js';
import {
  getMySubmissions,
  parseCreateSubmissionRequest,
  parseUploadAttachmentRequest,
  readAttachment,
  submitWork,
  uploadAttachment,
} from '../../server/src/submissions/submissions.service.js';

function fail(res: VercelResponse, status: number, error: string): void {
  res.status(status).json({ success: false, data: null, error });
}

/**
 * Student work, all in one function (Vercel's 12-function limit):
 *   GET  /api/submissions?route=me                    my submissions
 *   POST /api/submissions                             hand in work
 *   POST /api/submissions?route=attachment            upload a file for a task
 *   GET  /api/submissions?route=attachment&id=<id>    download a file (its owner or a teacher)
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    fail(res, 401, 'You need to sign in to do that.');
    return;
  }

  if (req.query.route === 'attachment' && req.method === 'GET') {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const file = await readAttachment(user, id);
    if (!file.ok) {
      fail(res, file.status, file.error);
      return;
    }
    res.setHeader('Content-Type', file.data.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.data.fileName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(file.data.data);
    return;
  }

  if (user.role !== 'STUDENT') {
    fail(res, 403, 'Your account is not allowed to do that.');
    return;
  }

  if (req.query.route === 'me') {
    const body: ApiResponse<SubmissionRecord[]> = { success: true, data: await getMySubmissions(user) };
    res.status(200).json(body);
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    fail(res, 405, `Method ${req.method} not allowed.`);
    return;
  }

  if (req.query.route === 'attachment') {
    const upload = parseUploadAttachmentRequest(req.body);
    if (!upload) {
      fail(res, 400, 'Choose a file to upload.');
      return;
    }
    const result = await uploadAttachment(user, upload);
    if (!result.ok) {
      fail(res, result.status, result.error);
      return;
    }
    const body: ApiResponse<AttachmentInfo> = { success: true, data: result.data };
    res.status(201).json(body);
    return;
  }

  const request = parseCreateSubmissionRequest(req.body);
  if (!request) {
    fail(res, 400, 'Choose a task and write a submission before sending.');
    return;
  }

  const result = await submitWork(user, request);
  if ('error' in result) {
    fail(res, result.status, result.error);
    return;
  }
  const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
  res.status(201).json(body);
}
