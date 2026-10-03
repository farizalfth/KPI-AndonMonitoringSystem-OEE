import type {
  DowntimeReasonType,
  EventSource,
  MachineStatus,
  ProductionEventType,
  ShotResult,
} from '../constants/enums.js';

/** One immutable operator/MQTT action. One row per `production_logs`. */
export interface ProductionLog {
  id: string;
  eventType: ProductionEventType;
  result: ShotResult | null;
  quantity: number;
  machineId: string;
  machineCode: string;
  workOrderId: string;
  workOrderCode: string;
  itemId: string;
  itemCode: string;
  shiftId: string;
  userId: string;
  userName: string;
  defectId: string | null;
  defectName: string | null;
  cycleTimeSeconds: number | null;
  downtimeLogId: string | null;
  source: EventSource;
  occurredAt: string;
}

export interface ProductionLogQuery {
  machineId?: string;
  workOrderId?: string;
  itemId?: string;
  shiftId?: string;
  eventType?: ProductionEventType;
  result?: ShotResult;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/** Interval based downtime row, referenced by `production_logs.downtime_log_id`. */
export interface DowntimeLog {
  id: string;
  machineId: string;
  machineCode: string;
  workOrderId: string | null;
  abnormalityId: string | null;
  abnormalityName: string | null;
  abnormalityCategory: string | null;
  shiftId: string | null;
  userId: string | null;
  reasonType: DowntimeReasonType;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  remarks: string | null;
}

/** Payload accepted by every `POST /api/production/*` endpoint. */
export interface StartShiftRequest {
  machineId: string;
  workOrderId: string;
}

export interface ProduceRequest {
  machineId: string;
  workOrderId: string;
  cycleTimeSeconds?: number;
  /** Defaults to the work order's item standard cycle time. */
  idealCycleTimeSeconds?: number;
  occurredAt?: string;
}

export interface NgRequest extends ProduceRequest {
  defectId: string;
}

export interface AbnormalityRequest {
  machineId: string;
  workOrderId: string;
  abnormalityId: string;
  startTime?: string;
  remarks?: string;
}

export interface BreakRequest {
  machineId: string;
  workOrderId: string;
  startTime?: string;
  remarks?: string;
}

export interface SetupRequest {
  machineId: string;
  workOrderId: string;
  productionSetupId?: string;
  startTime?: string;
  remarks?: string;
}

export interface FinishShiftRequest {
  machineId: string;
  workOrderId: string;
}

export interface CloseDowntimeRequest {
  endTime?: string;
  remarks?: string;
}

export interface ProductionEventResponse {
  log: ProductionLog;
  downtimeLog: DowntimeLog | null;
  machine: MachineSnapshot;
}

export interface MachineSnapshot {
  id: string;
  code: string;
  name: string;
  status: MachineStatus;
  updatedAt: string;
}