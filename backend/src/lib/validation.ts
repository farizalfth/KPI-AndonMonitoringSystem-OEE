import { z } from 'zod';

/** Shared reusable schema fragments. */

export const uuid = z.string().uuid('Must be a valid UUID');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)');

export const isoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 date time with timezone' });

/** `HH:MM` 24h clock, used by shifts. */
export const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be a 24h time (HH:MM)');

export const codeField = z
  .string()
  .trim()
  .min(2, 'At least 2 characters')
  .max(32, 'At most 32 characters')
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Letters, numbers, dot, dash and underscore only')
  .transform((value) => value.toUpperCase());

export const nameField = z.string().trim().min(2, 'At least 2 characters').max(120);

export const positiveInt = z.coerce.number().int().positive();

export const nonNegativeNumber = z.coerce.number().min(0);

/** Query string booleans arrive as "true"/"false" strings. */
export const queryBoolean = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

export const idParamSchema = z.object({ id: uuid });

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.string().trim().min(1).max(40).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type IdParam = z.infer<typeof idParamSchema>;