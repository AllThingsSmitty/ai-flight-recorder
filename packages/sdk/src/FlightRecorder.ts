import {
  AIEvent,
  Plugin,
  Recorder,
  RecordableEvent,
  ReplayEngine,
  Session,
  StartSessionOptions,
  Transport,
} from "@flight-recorder/core";

export type { AIEvent, Plugin, RecordableEvent, Session, StartSessionOptions, Transport };

export interface FlightRecorderOptions {
  /** Plugins to install immediately. More can be added later with `use()`. */
  plugins?: Plugin[];
  /**
   * Transport for persisting sessions. Called with the final session
   * immediately after `endSession()` completes.
   */
  transport?: Transport;
}

/**
 * Top-level entry point for the AI Flight Recorder SDK.
 *
 * Usage:
 *   import { FlightRecorder, ConsoleLogPlugin } from "@flight-recorder/sdk";
 *
 *   const fr = new FlightRecorder({
 *     plugins: [new ConsoleLogPlugin()],
 *   });
 *   const session = fr.startSession({ label: "my-chat" });
 *   fr.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
 *   fr.record({ type: "completion", response: "Hi!", finishReason: "stop" });
 *   const ended = fr.endSession();
 *   const replay = fr.createReplay(ended);
 *   replay.play();
 */
export class FlightRecorder {
  private _recorder = new Recorder();
  private _plugins: Plugin[] = [];
  private _transport?: Transport;

  constructor(options: FlightRecorderOptions = {}) {
    this._transport = options.transport;

    // Subscribe once to the recorder; fan out to all registered plugins
    this._recorder.subscribe((event) => {
      for (const plugin of this._plugins) {
        try {
          if (event.type === "session-started") {
            plugin.onSessionStart?.(this._recorder.session!);
          }
          plugin.onEvent?.(event);
          if (event.type === "session-ended") {
            plugin.onSessionEnd?.(this._recorder.session!);
          }
        } catch (err) {
          console.error(`[flight-recorder] Plugin "${plugin.name}" threw an error:`, err);
        }
      }
    });

    for (const plugin of options.plugins ?? []) {
      this._installPlugin(plugin);
    }
  }

  /** Register a plugin. Returns `this` for chaining: `fr.use(p1).use(p2)`. */
  use(plugin: Plugin): this {
    this._installPlugin(plugin);
    return this;
  }

  get session(): Session | null {
    return this._recorder.session;
  }

  startSession(options?: StartSessionOptions): Session {
    return this._recorder.startSession(options);
  }

  record(event: RecordableEvent): AIEvent {
    return this._recorder.record(event);
  }

  endSession(): Session {
    const session = this._recorder.endSession();

    if (this._transport) {
      const result = this._transport.save(session);
      if (result instanceof Promise) {
        result.catch((err) =>
          console.error("[flight-recorder] Transport save failed:", err)
        );
      }
    }

    return session;
  }

  subscribe(listener: (event: AIEvent) => void): () => void {
    return this._recorder.subscribe(listener);
  }

  createReplay(session: Session): ReplayEngine {
    return new ReplayEngine(session);
  }

  private _installPlugin(plugin: Plugin): void {
    if (this._plugins.some((p) => p.name === plugin.name)) {
      console.warn(
        `[flight-recorder] Plugin "${plugin.name}" is already registered and will be skipped.`
      );
      return;
    }
    this._plugins.push(plugin);
  }
}
