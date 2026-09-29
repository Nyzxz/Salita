import { Router } from 'express';
import type { ApiResponse, AuthSession, User } from '../../../shared/src/types.js';
import { login, parseLoginRequest } from '../auth/auth.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const request = parseLoginRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Enter your username and password, and choose a role.');
    }

    const session = await login(request);
    if (!session) {
      throw new ApiError(401, 'Incorrect username, password, or role.');
    }

    const body: ApiResponse<AuthSession> = { success: true, data: session };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth(), (_req, res) => {
  const body: ApiResponse<User> = { success: true, data: res.locals.user as User };
  res.json(body);
});
