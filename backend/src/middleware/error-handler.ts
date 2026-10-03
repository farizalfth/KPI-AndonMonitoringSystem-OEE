import type { NextFunction, Request, Response } from 'express';

import { isAppError } from '../lib/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

interface PostgresErrorLike {
  code?: string;
  constraint?: string;
  detail?: string;
  message: string;
}

/** PostgreSQL SQLSTATE codes that are safe to translate for API consumers. */
const PG_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: 'CONFLICT', message: 'A record with the same unique value already exists' },
  '23503': { status: 409, code: 'CONFLICT', message: 'The record is still referenced by other data' },
  // ON DELETE RESTRICT reports restrict_violation instead of foreign_key_violation.
  '23001': { status: 409, code: 'CONFLICT', message: 'The record is still referenced by other data' },
  '23502': { status: 400, code: 'BAD_REQUEST', message: 'A required field was missing' },
  '23514': { status: 400, code: 'BAD_REQUEST', message: 'A field value violates a database rule' },
  '22P02': { status: 400, code: 'BAD_REQUEST', message: 'Malformed value (expected e.g. a UUID or a number)' },
  '22001': { status: 400, code: 'BAD_REQUEST', message: 'A value is too long for its column' },
};

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} does not exist` },
  });
}

 
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, path: req.originalUrl }, 'application error');
    } else {
      logger.warn({ code: error.code, path: req.originalUrl, msg: error.message }, 'client error');
    }

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  const pgError = error as PostgresErrorLike;
  const mapped = pgError?.code ? PG_ERROR_MAP[pgError.code] : undefined;
  if (mapped) {
    logger.warn({ pgCode: pgError.code, constraint: pgError.constraint, path: req.originalUrl }, 'database error');
    res.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(env.isProduction ? {} : { details: { pgCode: pgError.code, constraint: pgError.constraint } }),
      },
    });
    return;
  }

  logger.error({ err: error, path: req.originalUrl, method: req.method }, 'unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      ...(env.isProduction ? {} : { details: { message: (error as Error)?.message } }),
    },
  });
}