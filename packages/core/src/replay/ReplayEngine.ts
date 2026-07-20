import { AIEvent } from "../events/AIEvent";
import { Session } from "../session/Session";
import { ReplaySpeed, ReplayState } from "./ReplayState";

type Handler<T> = (payload: T) => void;

interface ReplayEngineEventMap {
  event: AIEvent;
  stateChange: ReplayState;
  ended: undefined;
}

export class ReplayEngine {
  private _state: ReplayState;
  private _session: Session;
  private _timerId: ReturnType<typeof setTimeout> | null = null;
  private _playStartWallTime = 0;
  private _playStartSessionTime = 0;

  private _handlers: {
    [K in keyof ReplayEngineEventMap]?: Set<Handler<ReplayEngineEventMap[K]>>;
  } = {};

  constructor(session: Session) {
    if (session.status !== "ended") {
      throw new Error("ReplayEngine requires a completed (ended) session.");
    }
    this._session = session;

    const lastEvent = session.events.at(-1);
    const duration =
      session.endedAt != null
        ? session.endedAt - session.startedAt
        : lastEvent != null
          ? lastEvent.timestamp - session.startedAt
          : 0;

    this._state = {
      status: "idle",
      speed: 1,
      currentTime: 0,
      duration,
      eventIndex: 0,
    };
  }

  getState(): ReplayState {
    return this._state;
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  on<K extends keyof ReplayEngineEventMap>(
    name: K,
    handler: Handler<ReplayEngineEventMap[K]>
  ): () => void {
    if (!this._handlers[name]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._handlers as any)[name] = new Set();
    }
    (this._handlers[name] as Set<Handler<ReplayEngineEventMap[K]>>).add(handler);
    return () => this.off(name, handler);
  }

  off<K extends keyof ReplayEngineEventMap>(
    name: K,
    handler: Handler<ReplayEngineEventMap[K]>
  ): void {
    (this._handlers[name] as Set<Handler<ReplayEngineEventMap[K]>> | undefined)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  play(): void {
    if (this._state.status === "playing" || this._state.status === "ended") return;

    this._playStartWallTime = Date.now();
    this._playStartSessionTime = this._state.currentTime;
    this._patch({ status: "playing" });
    this._scheduleNext();
  }

  pause(): void {
    if (this._state.status !== "playing") return;
    this._clearTimer();
    this._patch({ status: "paused" });
  }

  seek(timeMs: number): void {
    const wasPlaying = this._state.status === "playing";
    this._clearTimer();

    const clampedTime = Math.max(0, Math.min(timeMs, this._state.duration));
    const eventIndex = this._indexAtTime(clampedTime);

    this._patch({
      currentTime: clampedTime,
      eventIndex,
      status: wasPlaying ? "playing" : "paused",
    });

    if (wasPlaying) {
      this._playStartWallTime = Date.now();
      this._playStartSessionTime = clampedTime;
      this._scheduleNext();
    }
  }

  setSpeed(speed: ReplaySpeed): void {
    const wasPlaying = this._state.status === "playing";
    this._clearTimer();
    this._patch({ speed });
    if (wasPlaying) {
      this._playStartWallTime = Date.now();
      this._playStartSessionTime = this._state.currentTime;
      this._scheduleNext();
    }
  }

  reset(): void {
    this._clearTimer();
    this._patch({ status: "idle", currentTime: 0, eventIndex: 0 });
  }

  // ---------------------------------------------------------------------------
  // Internal scheduling
  // ---------------------------------------------------------------------------

  private _scheduleNext(): void {
    const { eventIndex, speed } = this._state;
    const events = this._session.events;

    if (eventIndex >= events.length) {
      this._patch({ status: "ended", currentTime: this._state.duration });
      this._emit("ended", undefined);
      return;
    }

    const nextEvent = events[eventIndex];
    const eventSessionTime = nextEvent.timestamp - this._session.startedAt;
    const wallDelay = Math.max(0, (eventSessionTime - this._state.currentTime) / speed);

    this._timerId = setTimeout(() => {
      this._emit("event", nextEvent);
      this._patch({ currentTime: eventSessionTime, eventIndex: eventIndex + 1 });
      this._scheduleNext();
    }, wallDelay);
  }

  private _clearTimer(): void {
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  private _indexAtTime(timeMs: number): number {
    const idx = this._session.events.findIndex(
      (e) => e.timestamp - this._session.startedAt > timeMs
    );
    return idx === -1 ? this._session.events.length : idx;
  }

  private _patch(update: Partial<ReplayState>): void {
    this._state = { ...this._state, ...update };
    this._emit("stateChange", this._state);
  }

  private _emit<K extends keyof ReplayEngineEventMap>(
    name: K,
    payload: ReplayEngineEventMap[K]
  ): void {
    (this._handlers[name] as Set<Handler<ReplayEngineEventMap[K]>> | undefined)?.forEach(
      (h) => h(payload)
    );
  }
}
