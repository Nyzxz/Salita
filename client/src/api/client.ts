import type { ApiResponse, PageMeta } from '@shared/types';

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

/**
 * The session lives in an httpOnly cookie that the browser attaches by itself, so
 * no call needs (or can see) a token. The `token` arguments across the api files
 * are kept only so existing call sites keep compiling.
 */
let unauthorizedListener: (() => void) | null = null;

/** Called when the server says the session is no longer valid (expired, deactivated, password changed). */
export function onUnauthorized(listener: (() => void) | null): void {
  unauthorizedListener = listener;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  searchParams?: Record<string, string>;
  body?: unknown;
  token?: string;
}

function buildUrl(path: string, searchParams?: Record<string, string>): URL {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function sendFetch(url: URL, method: string, body: unknown): Promise<Response> {
  return fetch(url.toString(), {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      // Proves the call came from this app: cross-site forms and images cannot set custom headers.
      'X-Requested-With': 'salita',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function handleUnauthorized(path: string, status: number): void {
  if (status === 401 && !path.startsWith('/api/auth/login')) unauthorizedListener?.();
}

async function requestPage<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PageMeta }> {
  const { method = 'GET', searchParams, body } = options;
  const url = buildUrl(path, searchParams);

  let response: Response;
  try {
    response = await sendFetch(url, method, body);
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
    handleUnauthorized(path, response.status);
    const message = getErrorMessage(payload.error);
    throw new ApiRequestError(
      message ?? `Request to ${path} failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  return { data: payload.data, meta: payload.meta };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestPage<T>(path, options)).data;
}

/** GET a paginated list: returns the items and the paging details. */
export function apiGetPage<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<{ data: T; meta?: PageMeta }> {
  return requestPage<T>(path, { searchParams });
}

/** Downloads a file (CSV export, attachment) as a Blob, using the session cookie. */
export async function apiDownload(path: string, searchParams?: Record<string, string>): Promise<Blob> {
  let response: Response;
  try {
    response = await sendFetch(buildUrl(path, searchParams), 'GET', undefined);
  } catch {
    throw new ApiRequestError('Could not reach the server. Is it running?');
  }
  if (!response.ok) {
    handleUnauthorized(path, response.status);
    let message = `Download failed (HTTP ${response.status}).`;
    try {
      message = getErrorMessage(((await response.json()) as ApiResponse<null>).error) ?? message;
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiRequestError(message, response.status);
  }
  return response.blob();
}

/** Saves a Blob through the browser's download prompt. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

export function apiDelete<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: 'DELETE', token });
}

export function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'PUT', body, token });
}
