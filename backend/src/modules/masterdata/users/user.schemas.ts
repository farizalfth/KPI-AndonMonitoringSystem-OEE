import { z } from 'zod';

import { pageQuerySchema, queryBoolean, uuid } from '../../../lib/validation';
import { passwordSchema } from '../../auth/auth.schemas';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('A valid email is required')
  .max(160);

export const createUserSchema = z.object({
  email,
  password: passwordSchema,
  fullName: z.string().trim().min(2, 'At least 2 characters').max(120),
  roleId: uuid,
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z
  .object({
    email: email.optional(),
    fullName: z.string().trim().min(2).max(120).optional(),
    roleId: uuid.optional(),
    isActive: z.boolean().optional(),
    password: passwordSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const userListQuerySchema = pageQuerySchema.extend({
  isActive: queryBoolean.optional(),
  roleId: uuid.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;