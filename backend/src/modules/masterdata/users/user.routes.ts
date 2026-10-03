import { Router } from 'express';

import { asyncHandler } from '../../../lib/async-handler';
import { idParamSchema } from '../../../lib/validation';
import { authenticate } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  resetPasswordController,
  updateUserController,
} from './user.controller';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userListQuerySchema,
} from './user.schemas';

/** `/api/users` — mounted by the masterdata router behind `users:manage`. */
export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/', validate(userListQuerySchema, 'query'), asyncHandler(listUsersController));
userRouter.post('/', validate(createUserSchema), asyncHandler(createUserController));
userRouter.get('/:id', validate(idParamSchema, 'params'), asyncHandler(getUserController));
userRouter.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(updateUserController),
);
userRouter.post(
  '/:id/reset-password',
  validate(idParamSchema, 'params'),
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordController),
);
userRouter.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(deleteUserController));