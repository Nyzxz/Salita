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

interface RequestOptions {
  method?: 'GET' | 'POST';
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
    throw new ApiRequestError(payload.error ?? `Request to ${path} failed.`, response.status);
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
