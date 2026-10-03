/**
 * Canonical enum values.
 *
 * These constants are the single source of truth shared by the backend, the
 * frontend and the database CHECK constraints. When you add a value here you
 * MUST also update the matching CHECK constraint in `database/schema.sql`
 * (coordinated change, see docs/collaboration.md).
 */

export const ROLE_CODES = ['ADMIN', 'SUPERVISOR', 'OPERATOR'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const MACHINE_STATUSES = ['IDLE', 'RUNNING', 'DOWN', 'SETUP'] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const WORK_ORDER_PERIOD_TYPES = ['MONTHLY', 'DAILY'] as const;
export type WorkOrderPeriodType = (typeof WORK_ORDER_PERIOD_TYPES)[number];

export const WORK_ORDER_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'RUNNING',
  'COMPLETED',
  'CANCELLED',
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

/** Every operator action / MQTT event produces exactly one of these events. */
export const PRODUCTION_EVENT_TYPES = [
  'START_SHIFT',
  'PRODUCE',
  'NG',
  'SETUP',
  'BREAK',
  'ABNORMALITY',
  'FINISH_SHIFT',
] as const;
export type ProductionEventType = (typeof PRODUCTION_EVENT_TYPES)[number];

export const SHOT_RESULTS = ['OK', 'NG'] as const;
export type ShotResult = (typeof SHOT_RESULTS)[number];

export const DOWNTIME_REASON_TYPES = [
  'BREAK',
  'ABNORMALITY',
  'SETUP',
  'PLANNED',
  'OTHER',
] as const;
export type DowntimeReasonType = (typeof DOWNTIME_REASON_TYPES)[number];

export const ABNORMALITY_CATEGORIES = [
  'MECHANICAL',
  'ELECTRICAL',
  'MATERIAL',
  'PROCESS',
  'SENSOR',
  'OTHER',
] as const;
export type AbnormalityCategory = (typeof ABNORMALITY_CATEGORIES)[number];

export const OEE_GRANULARITIES = ['SHIFT', 'DAY'] as const;
export type OeeGranularity = (typeof OEE_GRANULARITIES)[number];

/** Where a production event entered the system. */
export const EVENT_SOURCES = ['OPERATOR', 'MQTT', 'API'] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const EVENT_ACTIONS = {
  START_SHIFT: 'start-shift',
  PRODUCE: 'produce',
  NG: 'ng',
  ABNORMALITY: 'abnormality',
  BREAK: 'break',
  SETUP: 'setup',
  FINISH_SHIFT: 'finish-shift',
} as const;
export type EventAction = (typeof EVENT_ACTIONS)[keyof typeof EVENT_ACTIONS];

export const EVENT_ACTION_TO_TYPE: Record<EventAction, ProductionEventType> = {
  'start-shift': 'START_SHIFT',
  produce: 'PRODUCE',
  ng: 'NG',
  abnormality: 'ABNORMALITY',
  break: 'BREAK',
  setup: 'SETUP',
  'finish-shift': 'FINISH_SHIFT',
};