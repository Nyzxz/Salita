import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, AuthSession, User } from '../../../shared/src/types.js';
import {
  changePassword,
  getUserFromAuthHeader,
  parseChangePasswordRequest,
  parseUpdateProfileRequest,
  updateProfile,
} from '../../../server/src/auth/auth.service.js';

function fail(res: VercelResponse, status: number, error: string): void {
  const body: ApiResponse<null> = { success: false, data: null, error };
  res.status(status).json(body);
}

/**
 * GET  /api/auth/me                  — who am I
 * PUT  /api/auth/me                  — edit my name / email
 * POST /api/auth/me?action=password  — change my password (returns a fresh session)
 * (One function for all three keeps the project inside Vercel's 12-function limit.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const header = req.headers.authorization;
  // A student who still has to change their default password may reach this endpoint (and only this one).
  const user = await getUserFromAuthHeader(typeof header === 'string' ? header : undefined, {
    allowPasswordChange: true,
  });

  if (!user) {
    fail(res, 401, 'You need to sign in to do that.');
    return;
  }

  if (req.method === 'GET') {
    const body: ApiResponse<User> = { success: true, data: user };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'PUT') {
    const patch = parseUpdateProfileRequest(req.body);
    if (!patch) {
      fail(res, 400, 'Send a valid name or email to update.');
      return;
    }
    const result = await updateProfile(user.id, patch);
    if (!result.ok) {
      fail(res, result.status, result.error);
      return;
    }
    const body: ApiResponse<User> = { success: true, data: result.data };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST' && req.query.action === 'password') {
    const request = parseChangePasswordRequest(req.body);
    if (!request) {
      fail(res, 400, 'Enter your current password and a new password.');
      return;
    }
    const result = await changePassword(user.id, request);
    if (!result.ok) {
      fail(res, result.status, result.error);
      return;
    }
    const body: ApiResponse<AuthSession> = { success: true, data: result.data };
    res.status(200).json(body);
    return;
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  fail(res, 405, `Method ${req.method} not allowed.`);
}
