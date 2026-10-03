/** Payload broadcast over WebSocket so the Andon board updates in realtime. */
export interface MachineStatusUpdate {
  machineId: string;
  machineCode: string;
  machineName: string;
  status: string;
  workOrderId: string | null;
  workOrderCode: string | null;
  itemName: string | null;
  targetQty: number;
  actualQty: number;
  okQty: number;
  ngQty: number;
  downtimeSeconds: number;
  shiftName: string | null;
  occurredAt: string;
}

export interface RealtimeEvent<T = unknown> {
  event: string;
  payload: T;
  emittedAt: string;
}

/** Channel names used by the Andon page. Mirrors `backend/src/websocket`. */
export const REALTIME_EVENTS = {
  PRODUCTION_UPDATE: 'production:update',
  MACHINE_STATUS: 'machine:status',
  OEE_UPDATE: 'oee:update',
  DOWNTIME_UPDATE: 'downtime:update',
  QUALITY_UPDATE: 'quality:update',
  SHIFT_UPDATE: 'shift:update',
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/** MQTT payloads (Operator Playground -> broker -> backend). */
export interface MqttProductionEvent {
  eventId?: string;
  machineId: string;
  machineCode?: string;
  workOrderId: string;
  event: string;
  timestamp: string;
  cycleTimeSeconds?: number;
  idealCycleTimeSeconds?: number;
  defectId?: string;
  abnormalityId?: string;
  operatorId?: string;
  remarks?: string;
}

export interface MqttTopics {
  produce: (machineCode: string) => string;
  ng: (machineCode: string) => string;
  abnormality: (machineCode: string) => string;
  break: (machineCode: string) => string;
  setup: (machineCode: string) => string;
  lifecycle: (machineCode: string) => string;
}

/** Topic builder — keep in sync with `backend/src/mqtt/topics.ts`. */
export const MQTT_TOPIC_ROOT = 'production/machine';

export function mqttTopic(
  machineCode: string,
  action: 'produce' | 'ng' | 'abnormality' | 'break' | 'setup' | 'shift',
): string {
  return `${MQTT_TOPIC_ROOT}/${machineCode}/${action}`;
}