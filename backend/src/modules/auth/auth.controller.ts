import type { Request, Response } from 'express';

import { unauthenticated } from '../../lib/errors';
import { getAuthenticatedUser, login } from './auth.service';
import { validatedBody } from '../../middleware/validate';
import type { loginSchema } from './auth.schemas';

export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, password } = validatedBody<typeof loginSchema>(req);
  const result = await login(email, password);
  res.status(200).json({ success: true, data: result });
}

export async function meController(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw unauthenticated();
  const user = await getAuthenticatedUser(req.auth.sub);
  res.status(200).json({ success: true, data: user });
}

/**
 * Stateless JWT: the server only acknowledges the logout, the client removes
 * the token. See docs/api.md for the consequences and the improvement path.
 */
export function logoutController(_req: Request, res: Response): void {
  res.status(204).send();
}