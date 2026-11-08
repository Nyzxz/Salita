import type {
  AuthSession,
  ChangePasswordRequest,
  LoginRequest,
  NotificationFeed,
  UpdateProfileRequest,
  User,
} from '@shared/types';
import { apiGet, apiPost, apiPut } from './client';

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

export function fetchNotifications(): Promise<NotificationFeed> {
  return apiGet<NotificationFeed>('/api/auth/me', { action: 'notifications' });
}

export function markNotificationsRead(request: { ids: string[] } | { all: true }): Promise<NotificationFeed> {
  return apiPost<NotificationFeed>('/api/auth/me?action=notifications-read', request);
}
