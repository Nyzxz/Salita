import type { AuthSession, ChangePasswordRequest, LoginRequest, UpdateProfileRequest, User } from '@shared/types';
import { apiGet, apiPost, apiPut } from './client';

export function loginRequest(credentials: LoginRequest): Promise<AuthSession> {
  return apiPost<AuthSession>('/api/auth/login', credentials);
}

export function fetchCurrentUser(token: string): Promise<User> {
  return apiGet<User>('/api/auth/me', undefined, token);
}

export function updateMyProfile(patch: UpdateProfileRequest, token: string): Promise<User> {
  return apiPut<User>('/api/auth/me', patch, token);
}

/** Changes the password and returns a fresh session (the old token still works, but carries the old flags). */
export function changeMyPassword(request: ChangePasswordRequest, token: string): Promise<AuthSession> {
  return apiPost<AuthSession>('/api/auth/me?action=password', request, token);
}
