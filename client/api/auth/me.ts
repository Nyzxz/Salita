import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseAvatarUpload, readAvatar, removeAvatar, saveAvatar } from '../../../server/src/auth/avatar.service.js';
import type { Achievements, ApiResponse, AuthSession, NotificationFeed, User } from '../../../shared/src/types.js';
import {
  changePassword,
  getUserFromRequest,
  parseChangePasswordRequest,
  parseUpdateProfileRequest,
  updateProfile,
} from '../../../server/src/auth/auth.service.js';
import { clearSessionCookie } from '../../../server/src/auth/cookies.js';
import { toCookieSession } from '../../../server/src/auth/sessionResponse.js';
import {
  ensureDueSoonReminders,
  listNotifications,
  markNotificationsRead,
  parseMarkReadRequest,
  streamNotificationEvents,
} from '../../../server/src/notifications/notifications.service.js';
import { getAchievements } from '../../../server/src/achievements/achievements.service.js';

function fail(res: VercelResponse, status: number, error: string): void {
  const body: ApiResponse<null> = { success: false, data: null, error };
  res.status(status).json(body);
}

/**
 * GET  /api/auth/me                          — who am I
 * PUT  /api/auth/me                          — edit my name / email
 * POST /api/auth/me?action=password          — change my password (sets a fresh session cookie)
 * POST /api/auth/me?action=logout            — end my session (clears the cookie)
 * GET  /api/auth/me?action=notifications     — my notifications and unread count
 * GET  /api/auth/me?action=achievements      — my streak and badges
 * GET  /api/auth/me?action=events            — live update stream (server-sent events, ~50 s per connection)
 * POST /api/auth/me?action=notifications-read — mark notifications read ({ ids } or { all: true })
 * (One function for all of these keeps the project inside Vercel's 12-function limit.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  // Signing out must always clear the cookie, even if the session has already expired.
  if (req.method === 'POST' && req.query.action === 'logout') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
    return;
  }

  // A student who still has to change their default password may reach this endpoint (and only this one).
  const user = await getUserFromRequest(req, { allowPasswordChange: true });

  if (!user) {
    fail(res, 401, 'You need to sign in to do that.');
    return;
  }

  // Profile picture: GET (?id=), POST { image } to set, DELETE to remove.
  if (req.query.action === 'avatar') {
    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id : user.id;
      const image = await readAvatar(user, id);
      if ('error' in image) {
        fail(res, image.status, image.error);
        return;
      }
      res.setHeader('Content-Type', image.data.contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
      // The URL carries the version, so a replaced picture gets a new URL.
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.status(200).send(image.data.data);
      return;
    }
    if (req.method === 'POST') {
      const upload = parseAvatarUpload(req.body);
      if ('error' in upload) {
        fail(res, 400, upload.error);
        return;
      }
      await saveAvatar(user.id, upload);
      const fresh = await getUserFromRequest(req, { allowPasswordChange: true });
      res.status(200).json({ success: true, data: fresh });
      return;
    }
    if (req.method === 'DELETE') {
      await removeAvatar(user.id);
      const fresh = await getUserFromRequest(req, { allowPasswordChange: true });
      res.status(200).json({ success: true, data: fresh });
      return;
    }
  }

  // Live updates: a short-lived event stream. The browser reconnects when it ends.
  if (req.method === 'GET' && req.query.action === 'events') {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);
    let closed = false;
    req.on('close', () => {
      closed = true;
    });
    await streamNotificationEvents(user.id, {
      write: (chunk) => {
        res.write(chunk);
      },
      isClosed: () => closed,
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.query.action === 'achievements') {
    const body: ApiResponse<Achievements> = { success: true, data: await getAchievements(user) };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'GET' && req.query.action === 'notifications') {
    if (user.role === 'STUDENT') await ensureDueSoonReminders(user);
    const body: ApiResponse<NotificationFeed> = { success: true, data: await listNotifications(user.id) };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST' && req.query.action === 'notifications-read') {
    const ids = parseMarkReadRequest(req.body);
    if (!ids) {
      fail(res, 400, 'Say which notifications to mark as read.');
      return;
    }
    await markNotificationsRead(user.id, ids);
    const body: ApiResponse<NotificationFeed> = { success: true, data: await listNotifications(user.id) };
    res.status(200).json(body);
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
    if ('error' in result) {
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
    if ('error' in result) {
      fail(res, result.status, result.error);
      return;
    }
    const { session, setCookie } = toCookieSession(result.data);
    res.setHeader('Set-Cookie', setCookie);
    const body: ApiResponse<AuthSession> = { success: true, data: session };
    res.status(200).json(body);
    return;
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  fail(res, 405, `Method ${req.method} not allowed.`);
}
