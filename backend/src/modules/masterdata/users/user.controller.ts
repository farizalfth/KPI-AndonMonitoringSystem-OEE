import type { Request, Response } from 'express';

import { unauthenticated } from '../../../lib/errors';
import { validatedBody, validatedQuery } from '../../../middleware/validate';
import type { ListOptions } from '../../../models/repository';
import { userService } from './user.service';
import type {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema} from './user.schemas';
import {
  type CreateUserInput,
  type ResetPasswordInput,
  type UpdateUserInput,
} from './user.schemas';

export async function listUsersController(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery(res) as ListOptions;
  const result = await userService.list(query);
  res.status(200).json({ success: true, data: result.items, meta: result.meta });
}

export async function getUserController(req: Request, res: Response): Promise<void> {
  const user = await userService.get(req.params.id as string);
  res.status(200).json({ success: true, data: user });
}

export async function createUserController(req: Request, res: Response): Promise<void> {
  const payload = validatedBody<typeof createUserSchema>(req) as CreateUserInput;
  const user = await userService.create(payload);
  res.status(201).json({ success: true, data: user });
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw unauthenticated();
  const payload = validatedBody<typeof updateUserSchema>(req) as UpdateUserInput;
  const user = await userService.update(req.params.id as string, payload, req.auth.sub);
  res.status(200).json({ success: true, data: user });
}

export async function resetPasswordController(req: Request, res: Response): Promise<void> {
  const payload = validatedBody<typeof resetPasswordSchema>(req) as ResetPasswordInput;
  const user = await userService.resetPassword(req.params.id as string, payload.password);
  res.status(200).json({ success: true, data: user });
}

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw unauthenticated();
  await userService.remove(req.params.id as string, req.auth.sub);
  res.status(204).send();
}