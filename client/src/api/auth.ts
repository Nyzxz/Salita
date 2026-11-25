import type {
  Achievements,
  AuthSession,
  ChangePasswordRequest,
  LoginRequest,
  NotificationFeed,
  UpdateProfileRequest,
  User,
} from '@shared/types';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

export function loginRequest(credentials: LoginRequest): Promise<AuthSession> {
  return apiPost<AuthSession>('/api/auth/login', credentials);
}

/** Who the session cookie belongs to (the cookie is sent automatically). */
export function fetchCurrentUser(_token?: string): Promise<User> {
  return apiGet<User>('/api/auth/me');
}

export function updateMyProfile(patch: UpdateProfileRequest, token?: string): Promise<User> {
  return apiPut<User>('/api/auth/me', patch, token);
}

/** Changes the password; the server replaces the session cookie and returns the fresh session. */
export function changeMyPassword(request: ChangePasswordRequest, token?: string): Promise<AuthSession> {
  return apiPost<AuthSession>('/api/auth/me?action=password', request, token);
}

/** Ends the session on the server by clearing the cookie. */
export function logoutRequest(): Promise<null> {
  return apiPost<null>('/api/auth/me?action=logout', {});
}

export function fetchAchievements(): Promise<Achievements> {
  return apiGet<Achievements>('/api/auth/me', { action: 'achievements' });
}

export function fetchNotifications(): Promise<NotificationFeed> {
  return apiGet<NotificationFeed>('/api/auth/me', { action: 'notifications' });
}

export function markNotificationsRead(request: { ids: string[] } | { all: true }): Promise<NotificationFeed> {
  return apiPost<NotificationFeed>('/api/auth/me?action=notifications-read', request);
}

/** Saves a profile picture (base64 JPEG/PNG, already shrunk) and returns the updated user. */
export function uploadAvatar(imageBase64: string): Promise<User> {
  return apiPost<User>('/api/auth/me?action=avatar', { image: imageBase64 });
}

export function deleteAvatar(): Promise<User> {
  return apiDelete<User>('/api/auth/me?action=avatar');
}

/** Where a user's picture is served from. The version in the URL refreshes the browser cache. */
export function avatarUrl(userId: string, version: number): string {
  return `/api/auth/me?action=avatar&id=${encodeURIComponent(userId)}&v=${version}`;
}
