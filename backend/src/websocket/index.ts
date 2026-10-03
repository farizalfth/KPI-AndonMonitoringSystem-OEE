import type { Server } from 'node:http';

import { REALTIME_EVENTS, type MachineStatusUpdate, type OeeSnapshot } from '@andon/shared';

import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * WebSocket gateway — **owned by member 3** (Phase 5).
 *
 * Contract (already agreed, see docs/api.md §8):
 *   Socket.IO namespace `/andon`, default path `/socket.io`.
 *   Server -> client events:
 *     production:update   MachineStatusUpdate   after every PRODUCE / NG
 *     machine:status      MachineStatusUpdate   on every status transition
 *     oee:update          OeeSnapshot           after OEE recomputation
 *     downtime:update     DowntimeLog           when downtime opens/closes
 *     quality:update      { machineId, okCount, ngCount, qualityRate }
 *   Client -> server:
 *     `subscribe` { machineIds?: string[] }  to filter a large board.
 *
 * Every broadcast must happen **after** the database transaction of the
 * originating event has been committed, otherwise the Andon board would show
 * numbers that are not persisted yet.
 */

let broadcast: ((event: string, payload: unknown) => void) | null = null;

export function startWebSocketGateway(server: Server): void {
  if (!env.WEBSOCKET_ENABLED) return;
  void server;

  // Member 3 implements: create the Socket.IO server on `server`, join the
  // `/andon` namespace and register the events listed above.
  logger.info('WebSocket gateway enabled (member 3 owns the implementation)');
  void broadcast;
}

export function stopWebSocketGateway(): void {
  broadcast = null;
}

/** Used by the production/OEE services to push realtime updates. */
export function emitRealtime(event: string, payload: MachineStatusUpdate | OeeSnapshot | unknown): void {
  if (!broadcast) return;
  broadcast(event, payload);
}

export const REALTIME_EVENT_NAMES = REALTIME_EVENTS;