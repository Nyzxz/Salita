import { Router } from 'express';
import type { ApiResponse, AuthSession, User } from '../../../shared/src/types.js';
import {
  changePassword,
  login,
  parseChangePasswordRequest,
  parseLoginRequest,
  parseUpdateProfileRequest,
  updateProfile,
} from '../auth/auth.service.js';
import { clientIpFrom } from '../auth/ipThrottle.js';
import { loginOutcomeToHttp } from '../auth/loginOutcome.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuthAllowingPasswordChange } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const request = parseLoginRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Enter your username and password, and choose a role.');
    }

    const ip = clientIpFrom(req.headers, req.ip);
    const { status, body, retryAfterSeconds } = loginOutcomeToHttp(await login(request, ip));
    if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
});

// /me works even while a student still has to change their default password.
authRouter.get('/me', requireAuthAllowingPasswordChange(), (_req, res) => {
  const body: ApiResponse<User> = { success: true, data: res.locals.user as User };
  res.json(body);
});

/** PUT /api/auth/me — edit your own name / email. */
authRouter.put('/me', requireAuthAllowingPasswordChange(), async (req, res, next) => {
  try {
    const patch = parseUpdateProfileRequest(req.body);
    if (!patch) throw new ApiError(400, 'Send a valid name or email to update.');
    const user = res.locals.user as User;
    const result = await updateProfile(user.id, patch);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<User> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/me?action=password — change your own password; returns a fresh session. */
authRouter.post('/me', requireAuthAllowingPasswordChange(), async (req, res, next) => {
  try {
    if (req.query.action !== 'password') throw new ApiError(404, 'No such endpoint.');
    const request = parseChangePasswordRequest(req.body);
    if (!request) throw new ApiError(400, 'Enter your current password and a new password.');
    const user = res.locals.user as User;
    const result = await changePassword(user.id, request);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<AuthSession> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
