import type { OeeGranularity } from '../constants/enums.js';
import type { MasterdataEntity } from './masterdata.js';

/**
 * All OEE inputs are persisted so every published number can be traced back to
 * the production logs / downtime logs / defects that produced it.
 */
export interface OeeRecord extends MasterdataEntity {
  granularity: OeeGranularity;
  periodDate: string;
  machineId: string | null;
  machineCode: string | null;
  workOrderId: string | null;
  itemId: string | null;
  shiftId: string | null;
  plannedSeconds: number;
  downtimeSeconds: number;
  breakdownSeconds: number;
  changeoverSeconds: number;
  breakSeconds: number;
  runSeconds: number;
  idealCycleTimeSeconds: number | null;
  idealOutput: number | null;
  totalOutput: number;
  okCount: number;
  ngCount: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  breakdown: Record<string, number>;
  computedAt: string;
}

export interface OeeQuery {
  granularity?: OeeGranularity;
  dateFrom?: string;
  dateTo?: string;
  machineId?: string;
  itemId?: string;
  shiftId?: string;
  workOrderId?: string;
  page?: number;
  limit?: number;
}

/** Live OEE figures broadcast over WebSocket (`oee:update`). */
export interface OeeSnapshot {
  machineId: string | null;
  shiftId: string | null;
  periodDate: string;
  plannedSeconds: number;
  downtimeSeconds: number;
  runSeconds: number;
  idealCycleTimeSeconds: number | null;
  idealOutput: number | null;
  totalOutput: number;
  okCount: number;
  ngCount: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  computedAt: string;
}