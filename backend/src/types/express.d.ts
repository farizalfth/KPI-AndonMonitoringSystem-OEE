import type { JwtPayload } from '@andon/shared';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `authenticate` / `optionalAuthenticate`. */
      auth?: JwtPayload;
    }
  }
}

export {};