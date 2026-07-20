import type { AIEvent } from "../events/AIEvent";
import type { Session } from "../session/Session";

/**
 * Implement this interface to hook into the FlightRecorder lifecycle.
 *
 * Plugins receive read-only access to sessions and events. They may not
 * modify events — use a custom transport or middleware layer for that.
 *
 * Usage:
 *   class MyPlugin implements Plugin {
 *     name = "my-plugin";
 *     onEvent(event) { console.log(event.type); }
 *   }
 *   const fr = new FlightRecorder({ plugins: [new MyPlugin()] });
 */
export interface Plugin {
  /** Unique display name — used in error messages and debug output. */
  readonly name: string;

  /**
   * Called when a new session starts, immediately after the `session-started`
   * event is recorded.
   */
  onSessionStart?(session: Session): void;

  /**
   * Called for every recorded event (including `session-started` and
   * `session-ended`). Invoked synchronously during `record()` / `endSession()`.
   */
  onEvent?(event: AIEvent): void;

  /**
   * Called when a session ends, immediately after the `session-ended`
   * event is recorded and before the transport saves the session.
   */
  onSessionEnd?(session: Session): void;
}
