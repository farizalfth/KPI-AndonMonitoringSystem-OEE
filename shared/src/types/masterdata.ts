import type { AbnormalityCategory, MachineStatus } from '../constants/enums.js';
import type { PageQuery } from './api.js';

/** Columns shared by every masterdata entity. */
export interface MasterdataEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shift extends MasterdataEntity {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  description: string | null;
  isActive: boolean;
}

export interface CreateShiftRequest {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  plannedMinutes?: number;
  description?: string;
  isActive?: boolean;
}

export type UpdateShiftRequest = Partial<CreateShiftRequest>;

export interface Item extends MasterdataEntity {
  code: string;
  name: string;
  category: string | null;
  unit: string;
  standardCycleTime: number | null;
  description: string | null;
  isActive: boolean;
}

export interface CreateItemRequest {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  standardCycleTime?: number | null;
  description?: string;
  isActive?: boolean;
}

export type UpdateItemRequest = Partial<CreateItemRequest>;

export interface Machine extends MasterdataEntity {
  code: string;
  name: string;
  area: string | null;
  /** Denormalised cache of the latest event; source of truth is `production_logs`. */
  status: MachineStatus;
  defaultCycleTime: number | null;
  description: string | null;
  isActive: boolean;
}

export interface CreateMachineRequest {
  code: string;
  name: string;
  area?: string;
  defaultCycleTime?: number | null;
  description?: string;
  isActive?: boolean;
}

export type UpdateMachineRequest = Partial<CreateMachineRequest>;

export interface Abnormality extends MasterdataEntity {
  code: string;
  name: string;
  category: AbnormalityCategory;
  isPlanned: boolean;
  defaultDurationMinutes: number | null;
  description: string | null;
  isActive: boolean;
}

export interface CreateAbnormalityRequest {
  code: string;
  name: string;
  category: AbnormalityCategory;
  isPlanned?: boolean;
  defaultDurationMinutes?: number | null;
  description?: string;
  isActive?: boolean;
}

export type UpdateAbnormalityRequest = Partial<CreateAbnormalityRequest>;

export interface Defect extends MasterdataEntity {
  code: string;
  name: string;
  defectType: string | null;
  description: string | null;
  isActive: boolean;
}

export interface CreateDefectRequest {
  code: string;
  name: string;
  defectType?: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateDefectRequest = Partial<CreateDefectRequest>;

export interface ProductionSetup extends MasterdataEntity {
  code: string;
  name: string;
  itemId: string | null;
  itemName: string | null;
  machineId: string | null;
  machineName: string | null;
  setupMinutes: number;
  description: string | null;
  isActive: boolean;
}

export interface CreateProductionSetupRequest {
  code: string;
  name: string;
  itemId?: string | null;
  machineId?: string | null;
  setupMinutes: number;
  description?: string;
  isActive?: boolean;
}

export type UpdateProductionSetupRequest = Partial<CreateProductionSetupRequest>;

/** Discriminator used by the generic masterdata CRUD routes. */
export type MasterdataResource =
  | 'roles'
  | 'shifts'
  | 'items'
  | 'machines'
  | 'abnormalities'
  | 'defects'
  | 'production-setups';

export interface MasterdataListQuery extends PageQuery {
  isActive?: boolean;
}