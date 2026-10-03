import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps a route handler so thrown errors and rejected promises reach the error
 * middleware instead of becoming unhandled rejections. Synchronous handlers
 * (e.g. `res.status(204).send()`) are supported as well.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    try {
      void Promise.resolve(handler(req as Req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}