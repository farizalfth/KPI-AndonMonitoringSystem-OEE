import { z } from 'zod';

import { ABNORMALITY_CATEGORIES, MACHINE_STATUSES } from '@andon/shared';

import { codeField, nameField, pageQuerySchema, positiveInt, queryBoolean, timeOfDay, uuid } from '../../lib/validation';

/**
 * Validation schemas for every masterdata resource (member 1).
 * These schemas are the API contract implementation described in docs/api.md.
 */

const description = z.string().trim().max(500).nullish();
const isActive = z.boolean().default(true);

/** `PATCH`/`PUT` bodies: partial, but never empty. */
function partial<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
}

export const roleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Code must start with a letter and contain letters, numbers or underscore')
    .transform((value) => value.toUpperCase()),
  name: nameField,
  description,
  baseRole: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']).nullish(),
});
export const roleUpdateSchema = partial({
  name: nameField,
  description,
  baseRole: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']).nullish(),
});

export const shiftCreateSchema = z.object({
  code: codeField,
  name: nameField,
  startTime: timeOfDay,
  endTime: timeOfDay,
  plannedMinutes: positiveInt.max(1440).default(480),
  description,
  isActive,
});
export const shiftUpdateSchema = partial({
  name: nameField,
  startTime: timeOfDay,
  endTime: timeOfDay,
  plannedMinutes: positiveInt.max(1440),
  description,
  isActive: z.boolean(),
});

export const itemCreateSchema = z.object({
  code: codeField,
  name: nameField,
  category: z.string().trim().max(60).nullish(),
  unit: z.string().trim().min(1).max(12).default('PCS'),
  standardCycleTime: z.coerce.number().positive('Standard cycle time must be greater than 0').nullish(),
  description,
  isActive,
});
export const itemUpdateSchema = partial({
  name: nameField,
  category: z.string().trim().max(60).nullish(),
  unit: z.string().trim().min(1).max(12),
  standardCycleTime: z.coerce.number().positive('Standard cycle time must be greater than 0').nullish(),
  description,
  isActive: z.boolean(),
});

export const machineCreateSchema = z.object({
  code: codeField,
  name: nameField,
  area: z.string().trim().max(60).nullish(),
  defaultCycleTime: z.coerce.number().positive('Default cycle time must be greater than 0').nullish(),
  description,
  isActive,
});
export const machineUpdateSchema = partial({
  name: nameField,
  area: z.string().trim().max(60).nullish(),
  defaultCycleTime: z.coerce.number().positive('Default cycle time must be greater than 0').nullish(),
  description,
  isActive: z.boolean(),
});

export const abnormalityCreateSchema = z.object({
  code: codeField,
  name: nameField,
  category: z.enum(ABNORMALITY_CATEGORIES).default('OTHER'),
  isPlanned: z.boolean().default(false),
  defaultDurationMinutes: positiveInt.max(1440).nullish(),
  description,
  isActive,
});
export const abnormalityUpdateSchema = partial({
  name: nameField,
  category: z.enum(ABNORMALITY_CATEGORIES),
  isPlanned: z.boolean(),
  defaultDurationMinutes: positiveInt.max(1440).nullish(),
  description,
  isActive: z.boolean(),
});

export const defectCreateSchema = z.object({
  code: codeField,
  name: nameField,
  defectType: z.string().trim().max(60).nullish(),
  description,
  isActive,
});
export const defectUpdateSchema = partial({
  name: nameField,
  defectType: z.string().trim().max(60).nullish(),
  description,
  isActive: z.boolean(),
});

export const productionSetupCreateSchema = z.object({
  code: codeField,
  name: nameField,
  itemId: uuid.nullish(),
  machineId: uuid.nullish(),
  setupMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  description,
  isActive,
});
export const productionSetupUpdateSchema = partial({
  name: nameField,
  itemId: uuid.nullish(),
  machineId: uuid.nullish(),
  setupMinutes: z.coerce.number().int().min(0).max(1440),
  description,
  isActive: z.boolean(),
});

/** Machine status is written by the production module, never by masterdata. */
export const machineStatusValues = MACHINE_STATUSES;

export const masterdataListQuerySchema = pageQuerySchema.extend({
  isActive: queryBoolean.optional(),
});

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
export type MachineCreateInput = z.infer<typeof machineCreateSchema>;
export type MachineUpdateInput = z.infer<typeof machineUpdateSchema>;
export type AbnormalityCreateInput = z.infer<typeof abnormalityCreateSchema>;
export type AbnormalityUpdateInput = z.infer<typeof abnormalityUpdateSchema>;
export type DefectCreateInput = z.infer<typeof defectCreateSchema>;
export type DefectUpdateInput = z.infer<typeof defectUpdateSchema>;
export type ProductionSetupCreateInput = z.infer<typeof productionSetupCreateSchema>;
export type ProductionSetupUpdateInput = z.infer<typeof productionSetupUpdateSchema>;