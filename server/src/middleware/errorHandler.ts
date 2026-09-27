import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '../../../shared/src/types.js';

/** Thrown by route handlers for expected, client-facing failures (bad input, missing id). */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/** 404 handler for any route that doesn't match — must be registered after all routes. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: `No route matches ${req.method} ${req.originalUrl}`,
  };
  res.status(404).json(body);
}

/** Express error middleware (4-arg signature is required for Express to recognize it). */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Unexpected server error.';

  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error('[unhandled error]', err);
  }

  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: message,
  };
  res.status(status).json(body);
}
