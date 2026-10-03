import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginController, logoutController, meController } from './auth.controller';
import { loginSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), asyncHandler(loginController));
authRouter.get('/me', authenticate, asyncHandler(meController));
authRouter.post('/logout', authenticate, asyncHandler(logoutController));