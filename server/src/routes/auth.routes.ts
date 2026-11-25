import { Router } from 'express';
import { parseAvatarUpload, readAvatar, removeAvatar, saveAvatar } from '../auth/avatar.service.js';
import type { Achievements, ApiResponse, AuthSession, NotificationFeed, User } from '../../../shared/src/types.js';
import {
  changePassword,
  login,
  parseChangePasswordRequest,
  parseLoginRequest,
  parseUpdateProfileRequest,
  updateProfile,
} from '../auth/auth.service.js';
import { clearSessionCookie } from '../auth/cookies.js';
import { toCookieSession } from '../auth/sessionResponse.js';
import { ensureDueSoonReminders, listNotifications, markNotificationsRead, parseMarkReadRequest, streamNotificationEvents } from '../notifications/notifications.service.js';
import { getAchievements } from '../achievements/achievements.service.js';
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
    const { status, body, retryAfterSeconds, setCookie } = loginOutcomeToHttp(await login(request, ip));
    if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds));
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
});

// /me works even while a student still has to change their default password.
authRouter.get('/me', requireAuthAllowingPasswordChange(), async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.query.action === 'avatar') {
      const viewer = res.locals.user as User;
      const id = typeof req.query.id === 'string' ? req.query.id : viewer.id;
      const image = await readAvatar(viewer, id);
      if (!image.ok) throw new ApiError(image.status, image.error);
      res.setHeader('Content-Type', image.data.contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(image.data.data);
      return;
    }
    if (req.query.action === 'events') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      let closed = false;
      req.on('close', () => {
        closed = true;
      });
      await streamNotificationEvents((res.locals.user as User).id, {
        write: (chunk) => {
          res.write(chunk);
        },
        isClosed: () => closed,
      });
      res.end();
      return;
    }
    if (req.query.action === 'achievements') {
      const body: ApiResponse<Achievements> = { success: true, data: await getAchievements(res.locals.user as User) };
      res.json(body);
      return;
    }
    if (req.query.action === 'notifications') {
      const viewer = res.locals.user as User;
      if (viewer.role === 'STUDENT') await ensureDueSoonReminders(viewer);
      const body: ApiResponse<NotificationFeed> = { success: true, data: await listNotifications(viewer.id) };
      res.json(body);
      return;
    }
    const body: ApiResponse<User> = { success: true, data: res.locals.user as User };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/me?action=logout — clears the session cookie, even if the session already expired. */
authRouter.post('/me', (req, res, next) => {
  if (req.query.action !== 'logout') {
    next();
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ success: true, data: null });
});

/** POST/DELETE /api/auth/me?action=avatar — set or remove your profile picture. */
authRouter.all('/me', requireAuthAllowingPasswordChange(), async (req, res, next) => {
  if (req.query.action !== 'avatar' || (req.method !== 'POST' && req.method !== 'DELETE')) {
    next();
    return;
  }
  try {
    const user = res.locals.user as User;
    if (req.method === 'POST') {
      const upload = parseAvatarUpload(req.body);
      if ('error' in upload) throw new ApiError(400, upload.error);
      await saveAvatar(user.id, upload);
    } else {
      await removeAvatar(user.id);
    }
    const fresh = await updateProfile(user.id, {});
    if (!fresh.ok) throw new ApiError(fresh.status, fresh.error);
    res.json({ success: true, data: fresh.data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout — clears the session cookie. */
authRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ success: true, data: null });
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
    if (req.query.action === 'logout') {
      res.setHeader('Set-Cookie', clearSessionCookie());
      res.json({ success: true, data: null });
      return;
    }
    if (req.query.action === 'notifications-read') {
      const ids = parseMarkReadRequest(req.body);
      if (!ids) throw new ApiError(400, 'Say which notifications to mark as read.');
      const user = res.locals.user as User;
      await markNotificationsRead(user.id, ids);
      const body: ApiResponse<NotificationFeed> = { success: true, data: await listNotifications(user.id) };
      res.json(body);
      return;
    }
    if (req.query.action !== 'password') throw new ApiError(404, 'No such endpoint.');
    const request = parseChangePasswordRequest(req.body);
    if (!request) throw new ApiError(400, 'Enter your current password and a new password.');
    const user = res.locals.user as User;
    const result = await changePassword(user.id, request);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const { session, setCookie } = toCookieSession(result.data);
    res.setHeader('Set-Cookie', setCookie);
    const body: ApiResponse<AuthSession> = { success: true, data: session };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
