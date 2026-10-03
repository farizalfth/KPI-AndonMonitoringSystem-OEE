import type { Role } from '@andon/shared';
import { permissionsForRole, ROLE_PERMISSIONS, type RoleCode } from '@andon/shared';
import type { ZodTypeAny } from 'zod';

import { conflict, notFound } from '../../lib/errors';
import {
  abnormalityRepository,
  defectRepository,
  itemRepository,
  machineRepository,
  productionSetupRepository,
  roleRepository,
  shiftRepository,
} from '../../models/masterdata.model';
import type { Repository } from '../../models/repository';
import {
  abnormalityCreateSchema,
  abnormalityUpdateSchema,
  defectCreateSchema,
  defectUpdateSchema,
  itemCreateSchema,
  itemUpdateSchema,
  machineCreateSchema,
  machineUpdateSchema,
  productionSetupCreateSchema,
  productionSetupUpdateSchema,
  roleCreateSchema,
  roleUpdateSchema,
  shiftCreateSchema,
  shiftUpdateSchema,
} from './masterdata.schemas';

/**
 * Masterdata service (member 1).
 *
 * One registry drives the generic CRUD routes: adding a masterdata resource
 * means adding one entry here (plus a zod schema pair), nothing else.
 *
 * Entities are handled as `unknown` because the controllers only serialise them
 * to JSON — the concrete shape per resource is guaranteed by the zod schema
 * and by `shared/src/types/masterdata.ts`.
 */
export interface ResourceDefinition {
  /** URL segment, e.g. `production-setups`. */
  resource: string;
  /** Human readable singular, used in error messages. */
  label: string;
  repository: Repository<unknown>;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** True when the table has a unique `code` column worth checking explicitly. */
  hasCode?: boolean;
  /** Enrich an entity right after reading it (e.g. role permissions). */
  afterRead?: (entity: unknown) => unknown;
}

/** Permissions are derived from `roles.base_role` (or the code of a system role). */
function withRolePermissions(entity: unknown): Role {
  const role = entity as Role;
  const base = (role.baseRole ?? role.code) as RoleCode;
  return { ...role, permissions: ROLE_PERMISSIONS[base] ?? permissionsForRole('OPERATOR') };
}

export const masterdataResources = {
  roles: {
    resource: 'roles',
    label: 'Role',
    repository: roleRepository,
    createSchema: roleCreateSchema,
    updateSchema: roleUpdateSchema,
    hasCode: true,
    afterRead: withRolePermissions,
  },
  shifts: {
    resource: 'shifts',
    label: 'Shift',
    repository: shiftRepository,
    createSchema: shiftCreateSchema,
    updateSchema: shiftUpdateSchema,
    hasCode: true,
  },
  items: {
    resource: 'items',
    label: 'Item',
    repository: itemRepository,
    createSchema: itemCreateSchema,
    updateSchema: itemUpdateSchema,
    hasCode: true,
  },
  machines: {
    resource: 'machines',
    label: 'Machine',
    repository: machineRepository,
    createSchema: machineCreateSchema,
    updateSchema: machineUpdateSchema,
    hasCode: true,
  },
  abnormalities: {
    resource: 'abnormalities',
    label: 'Abnormality',
    repository: abnormalityRepository,
    createSchema: abnormalityCreateSchema,
    updateSchema: abnormalityUpdateSchema,
    hasCode: true,
  },
  defects: {
    resource: 'defects',
    label: 'Defect',
    repository: defectRepository,
    createSchema: defectCreateSchema,
    updateSchema: defectUpdateSchema,
    hasCode: true,
  },
  'production-setups': {
    resource: 'production-setups',
    label: 'Production setup',
    repository: productionSetupRepository,
    createSchema: productionSetupCreateSchema,
    updateSchema: productionSetupUpdateSchema,
    hasCode: true,
  },
} satisfies Record<string, ResourceDefinition>;

export type MasterdataResourceKey = keyof typeof masterdataResources;

export function getResource(key: string): ResourceDefinition {
  const definition = masterdataResources[key as MasterdataResourceKey];
  if (!definition) throw notFound('Masterdata resource', key);
  return definition;
}

async function assertCodeIsFree(
  definition: ResourceDefinition,
  code: unknown,
  excludeId?: string,
): Promise<void> {
  if (!definition.hasCode || typeof code !== 'string' || code.length === 0) return;

  const existing = await definition.repository.findOneBy('code', code, excludeId ? { excludeId } : {});
  if (existing) throw conflict(`${definition.label} code "${code}" already exists`);
}

function read<T>(definition: ResourceDefinition, entity: unknown): T {
  return (definition.afterRead ? definition.afterRead(entity) : entity) as T;
}

export const masterdataService = {
  async list(key: MasterdataResourceKey, options: Parameters<Repository<unknown>['list']>[0]) {
    const definition = masterdataResources[key];
    const result = await definition.repository.list(options);
    return {
      ...result,
      items: result.items.map((item) => read(definition, item)),
    };
  },

  async get(key: MasterdataResourceKey, id: string): Promise<unknown> {
    const definition = masterdataResources[key];
    const entity = await definition.repository.findById(id);
    if (!entity) throw notFound(definition.label, id);
    return read(definition, entity);
  },

  async create(key: MasterdataResourceKey, payload: unknown): Promise<unknown> {
    const definition = masterdataResources[key];
    const data = definition.createSchema.parse(payload) as Record<string, unknown>;

    await assertCodeIsFree(definition, data.code);

    const created = await definition.repository.create(data);
    return read(definition, created);
  },

  async update(key: MasterdataResourceKey, id: string, payload: unknown): Promise<unknown> {
    const definition = masterdataResources[key];
    const data = definition.updateSchema.parse(payload) as Record<string, unknown>;

    const current = await definition.repository.findById(id);
    if (!current) throw notFound(definition.label, id);

    if (data.code !== undefined) {
      await assertCodeIsFree(definition, data.code, id);
    }

    const updated = await definition.repository.update(id, data);
    return read(definition, updated);
  },

  async remove(key: MasterdataResourceKey, id: string): Promise<void> {
    await masterdataResources[key].repository.remove(id);
  },
};