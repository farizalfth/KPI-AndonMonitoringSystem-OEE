import type { WorkOrderPeriodType, WorkOrderStatus } from '../constants/enums.js';
import type { MasterdataEntity } from './masterdata.js';

export interface WorkOrder extends MasterdataEntity {
  code: string;
  periodType: WorkOrderPeriodType;
  periodStart: string;
  periodEnd: string;
  status: WorkOrderStatus;
  machineId: string;
  machineCode: string;
  machineName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  shiftId: string;
  shiftName: string;
  targetQty: number;
  actualQty: number;
  okQty: number;
  ngQty: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  notes: string | null;
}

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  targetQty: number;
  sequence: number;
}

export interface CreateWorkOrderRequest {
  code?: string;
  periodType: WorkOrderPeriodType;
  periodStart: string;
  periodEnd: string;
  machineId: string;
  itemId: string;
  shiftId: string;
  targetQty: number;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  notes?: string;
  /** Optional additional item lines (single-item work orders may omit this). */
  items?: Array<{ itemId: string; targetQty: number }>;
}

export type UpdateWorkOrderRequest = Partial<Omit<CreateWorkOrderRequest, 'periodType'>>;

export interface ApproveWorkOrderRequest {
  notes?: string;
}

export interface RejectWorkOrderRequest {
  reason: string;
}