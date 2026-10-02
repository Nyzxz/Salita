import { Router } from 'express';
import type { ApiResponse, AuthSession, User } from '../../../shared/src/types.js';
import { login, parseLoginRequest } from '../auth/auth.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import rateLimit from 'express-rate-limit';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
  },
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
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
