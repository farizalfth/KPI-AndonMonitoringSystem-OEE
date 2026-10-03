/**
 * Application level errors.
 *
 * Every error that reaches the client is an `AppError`, which guarantees a
 * consistent envelope and a stable machine readable `code`.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    expose = statusCode < 500,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = expose;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

export const validationError = (details: unknown, message = 'Request validation failed') =>
  new AppError(message, 400, 'VALIDATION_ERROR', details);

export const unauthenticated = (message = 'Authentication required') =>
  new AppError(message, 401, 'UNAUTHENTICATED');

export const invalidCredentials = () =>
  new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(message, 403, 'FORBIDDEN');

export const notFound = (resource: string, id?: string) =>
  new AppError(
    id ? `${resource} '${id}' was not found` : `${resource} was not found`,
    404,
    'NOT_FOUND',
  );

export const conflict = (message: string, details?: unknown) =>
  new AppError(message, 409, 'CONFLICT', details);

export const businessRule = (message: string, details?: unknown) =>
  new AppError(message, 422, 'BUSINESS_RULE_VIOLATION', details);

export const internalError = (message = 'Internal server error') =>
  new AppError(message, 500, 'INTERNAL_ERROR', undefined, false);

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}