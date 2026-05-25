import type { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: z.ZodError,
  ) {
    super(message || code);
    this.name = 'HttpError';
  }
}

export function notFound(message?: string) {
  return new HttpError(404, 'room_not_found', message);
}

export function invalidToken(message?: string) {
  return new HttpError(401, 'invalid_token', message);
}

export function roomExpired(message?: string) {
  return new HttpError(403, 'room_expired', message);
}

export function rateLimited(retryAfter = 60) {
  return new HttpError(429, 'rate_limited', `Rate limited. Retry after ${retryAfter}s`);
}

export function validationError(details: z.ZodError) {
  return new HttpError(400, 'validation_error', 'Request validation failed', details);
}

export function internalError(message?: string) {
  return new HttpError(500, 'internal_error', message || 'Internal server error');
}
