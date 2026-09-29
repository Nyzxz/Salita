import type { ApiResponse } from '@shared/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** Thrown when the server responds but reports failure, or the request itself fails. */
export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string' && error.trim()) return error;
  if (!error || typeof error !== 'object') return undefined;

  const record = error as Record<string, unknown>;
  for (const key of ['message', 'error', 'details']) {
    const message = getErrorMessage(record[key]);
    if (message) return message;
  }
  return undefined;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  searchParams?: Record<string, string>;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', searchParams, body, token } = options;
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiRequestError('Could not reach the server. Is it running?');
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError('The server sent back a response that was not valid JSON.', response.status);
  }

  if (!response.ok || !payload.success) {
    const message = getErrorMessage(payload.error);
    throw new ApiRequestError(
      message ?? `Request to ${path} failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  return payload.data;
}

export function apiGet<T>(
  path: string,
  searchParams?: Record<string, string>,
  token?: string,
): Promise<T> {
  return request<T>(path, { searchParams, token });
}

export function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'POST', body, token });
}

export function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'PUT', body, token });
}
