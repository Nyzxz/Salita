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

/**
 * GETs `path` (e.g. "/api/words") and unwraps the shared `ApiResponse<T>` envelope,
 * throwing an `ApiRequestError` if the network call, JSON parse, or server-reported
 * `success` flag indicates failure.
 */
export async function apiGet<T>(path: string, searchParams?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
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
