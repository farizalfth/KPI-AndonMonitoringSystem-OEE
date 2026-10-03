import { MQTT_TOPIC_ROOT, type MqttProductionEvent, type ProductionEventType } from '@andon/shared';

import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * MQTT layer — **owned by member 3** (Phase 4).
 *
 * This file only defines the contract so that member 2 (operator playground,
 * publisher) and member 3 (consumer) agree on topics and payloads before any
 * of them implements their side.
 *
 * Topics (root configurable through `MQTT_TOPIC_ROOT`):
 *   production/machine/{machineCode}/produce
 *   production/machine/{machineCode}/ng
 *   production/machine/{machineCode}/abnormality
 *   production/machine/{machineCode}/break
 *   production/machine/{machineCode}/setup
 *   production/machine/{machineCode}/shift        (START_SHIFT / FINISH_SHIFT)
 *
 * Expected payload (`MqttProductionEvent`):
 *   {
 *     "machineId": "MC-001",
 *     "machineCode": "MC-001",
 *     "workOrderId": "…uuid…",
 *     "event": "PRODUCE",
 *     "timestamp": "2026-01-15T08:15:00.000Z",
 *     "cycleTimeSeconds": 10.4,
 *     "defectId": "…uuid…",
 *     "operatorId": "…uuid…"
 *   }
 *
 * Implementation requirements for the owner:
 *  - subscribe to `${MQTT_TOPIC_ROOT}/+/+`;
 *  - validate the payload (zod schema in `mqtt.payload.schema.ts`);
 *  - hand the event to the *same* service the REST controller uses, so the
 *    database rows, the OEE recomputation and the WebSocket broadcast are
 *    identical regardless of the event source (see `source` column);
 *  - never trust the payload: resolve machine/work order/defect by code or id
 *    in the database and reject unknown references.
 */

export const MQTT_ROOT = MQTT_TOPIC_ROOT;

export type MqttEventType = ProductionEventType;

export type MqttPayload = MqttProductionEvent;

export interface MqttConsumer {
  start(): void;
  stop(): Promise<void>;
}

/**
 * No-op wiring used until member 3 implements the consumer. The server already
 * calls these, so Phase 4 only has to fill in the bodies.
 */
export function startMqttConsumer(): void {
  logger.info(
    { url: env.MQTT_URL, root: env.MQTT_TOPIC_ROOT },
    'MQTT consumer enabled (member 3 owns the implementation)',
  );
}

export async function stopMqttConsumer(): Promise<void> {
  // nothing to close yet
}