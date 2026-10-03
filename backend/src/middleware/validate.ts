import type { NextFunction, Request, Response } from 'express';
import type { ZodError} from 'zod';
import { type ZodTypeAny, type z } from 'zod';

import { validationError } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

function formatIssues(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validates and *replaces* the request part with the parsed value, so handlers
 * always work with typed, coerced and stripped data (unknown keys are dropped).
 *
 * `req.query` is a getter on some Express versions, therefore the parsed value
 * is stored on `res.locals.validated` as well and read through
 * `validatedQuery(req, res)`.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(validationError(formatIssues(result.error)));
      return;
    }

    if (source === 'query') {
      res.locals.query = result.data;
    } else {
      req[source] = result.data as never;
    }

    next();
  };
}

export function validatedQuery<T extends ZodTypeAny>(res: Response): z.infer<T> {
  return res.locals.query as z.infer<T>;
}

export function validatedBody<T extends ZodTypeAny>(req: Request): z.infer<T> {
  return req.body as z.infer<T>;
}

export function validatedParams<T extends ZodTypeAny>(req: Request): z.infer<T> {
  return req.params as z.infer<T>;
}