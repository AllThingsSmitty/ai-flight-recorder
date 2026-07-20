import type { Session } from "../session/Session";

/**
 * Implement this interface to provide a custom storage backend for recorded sessions.
 *
 * Examples: in-memory map, filesystem (`.flight` files), remote API, database.
 *
 * Usage:
 *   class MyTransport implements Transport {
 *     save(session) { ... }
 *   }
 *   const fr = new FlightRecorder({ transport: new MyTransport() });
 */
export interface Transport {
  save(session: Session): void | Promise<void>;
}
