import type { Role, Shift, Item, Machine, Abnormality, Defect, ProductionSetup } from '@andon/shared';

import { createRepository } from './repository';

/**
 * Masterdata repositories (member 1).
 *
 * Each resource is a plain table plus optional joins; the repository factory
 * turns them into the five CRUD endpoints in `masterdata.routes.ts`.
 */

export const roleRepository = createRepository<Role>({
  table: 'roles',
  alias: 'r',
  fields: {
    code: 'code',
    name: 'name',
    description: 'description',
    baseRole: 'base_role',
    isSystem: 'is_system',
  },
  searchable: ['code', 'name', 'description'],
  sortable: ['code', 'name', 'createdAt'],
  defaultSort: 'code',
  map: (row) => ({
    ...(row as unknown as Role),
    // `permissions` is derived in the service layer (base role matrix).
    permissions: [] as Role['permissions'],
  }),
});

export const shiftRepository = createRepository<Shift>({
  table: 'shifts',
  alias: 's',
  fields: {
    code: 'code',
    name: 'name',
    startTime: 'start_time',
    endTime: 'end_time',
    plannedMinutes: 'planned_minutes',
    description: 'description',
    isActive: 'is_active',
  },
  searchable: ['code', 'name', 'description'],
  sortable: ['code', 'name', 'startTime', 'plannedMinutes'],
  defaultSort: 'code',
});

export const itemRepository = createRepository<Item>({
  table: 'items',
  alias: 'i',
  fields: {
    code: 'code',
    name: 'name',
    category: 'category',
    unit: 'unit',
    standardCycleTime: 'standard_cycle_time',
    description: 'description',
    isActive: 'is_active',
  },
  searchable: ['code', 'name', 'category'],
  sortable: ['code', 'name', 'category', 'standardCycleTime'],
  defaultSort: 'code',
});

export const machineRepository = createRepository<Machine>({
  table: 'machines',
  alias: 'm',
  fields: {
    code: 'code',
    name: 'name',
    area: 'area',
    status: 'status',
    defaultCycleTime: 'default_cycle_time',
    description: 'description',
    isActive: 'is_active',
  },
  searchable: ['code', 'name', 'area'],
  sortable: ['code', 'name', 'area', 'status'],
  defaultSort: 'code',
});

export const abnormalityRepository = createRepository<Abnormality>({
  table: 'abnormalities',
  alias: 'a',
  fields: {
    code: 'code',
    name: 'name',
    category: 'category',
    isPlanned: 'is_planned',
    defaultDurationMinutes: 'default_duration_minutes',
    description: 'description',
    isActive: 'is_active',
  },
  searchable: ['code', 'name', 'category'],
  sortable: ['code', 'name', 'category'],
  defaultSort: 'code',
});

export const defectRepository = createRepository<Defect>({
  table: 'defects',
  alias: 'd',
  fields: {
    code: 'code',
    name: 'name',
    defectType: 'defect_type',
    description: 'description',
    isActive: 'is_active',
  },
  searchable: ['code', 'name', 'defectType'],
  sortable: ['code', 'name', 'defectType'],
  defaultSort: 'code',
});

export const productionSetupRepository = createRepository<ProductionSetup>({
  table: 'production_setups',
  alias: 'ps',
  fields: {
    code: 'code',
    name: 'name',
    itemId: 'item_id',
    machineId: 'machine_id',
    setupMinutes: 'setup_minutes',
    description: 'description',
    isActive: 'is_active',
  },
  joins: 'LEFT JOIN items i ON i.id = ps.item_id LEFT JOIN machines m ON m.id = ps.machine_id',
  extraSelect: 'i.name AS "itemName", m.name AS "machineName"',
  searchable: ['code', 'name'],
  sortable: ['code', 'name', 'setupMinutes'],
  defaultSort: 'code',
});

/**
 * Guard rails for the two fields other modules depend on:
 *  - `machines.status` must match `shared` MACHINE_STATUSES;
 *  - `items.standard_cycle_time` / `machines.default_cycle_time` are seconds.
 */
export const CYCLE_TIME_UNIT = 'seconds';