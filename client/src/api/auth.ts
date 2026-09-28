import type { AuthSession, LoginRequest, User } from '@shared/types';
import { apiGet, apiPost } from './client';

export function loginRequest(credentials: LoginRequest): Promise<AuthSession> {
  return apiPost<AuthSession>('/api/auth/login', credentials);
}

export function fetchCurrentUser(token: string): Promise<User> {
  return apiGet<User>('/api/auth/me', undefined, token);
}
