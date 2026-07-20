import { AIEvent } from "../events/AIEvent";
import { Session, SessionStatus } from "../session/Session";
import { generateId } from "../utils/ids";

export interface StartSessionOptions {
  label?: string;
  tags?: string[];
}

// Distributive omit: distributes over the union so each member retains its own fields.
// Plain Omit<AIEvent, Keys> collapses to common keys only — the distributive form preserves discriminants.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type RecordableEvent = DistributiveOmit<AIEvent, "id" | "sessionId" | "timestamp">;

type RecorderListener = (event: AIEvent) => void;

export class Recorder {
  private _session: Session | null = null;
  private _listeners: Set<RecorderListener> = new Set();

  get session(): Session | null {
    return this._session;
  }

  startSession(options: StartSessionOptions = {}): Session {
    if (this._session?.status === "recording") {
      throw new Error("A session is already recording. Call endSession() first.");
    }

    const sessionId = generateId();
    const startedAt = Date.now();

    const startEvent: AIEvent = {
      id: generateId(),
      sessionId,
      type: "session-started",
      timestamp: startedAt,
      label: options.label,
      tags: options.tags,
    };

    this._session = {
      id: sessionId,
      label: options.label,
      tags: options.tags,
      status: "recording" as SessionStatus,
      startedAt,
      events: [startEvent],
    };

    this._emit(startEvent);
    return this._session;
  }

  record(partial: RecordableEvent): AIEvent {
    if (!this._session || this._session.status !== "recording") {
      throw new Error("No active recording session. Call startSession() first.");
    }

    const event = {
      ...partial,
      id: generateId(),
      sessionId: this._session.id,
      timestamp: Date.now(),
    } as AIEvent;

    this._session = {
      ...this._session,
      events: [...this._session.events, event],
    };

    this._emit(event);
    return event;
  }

  endSession(): Session {
    if (!this._session || this._session.status !== "recording") {
      throw new Error("No active recording session to end.");
    }

    const endedAt = Date.now();
    const durationMs = endedAt - this._session.startedAt;

    const totalTokens = this._session.events.reduce((sum: number, e: AIEvent) => {
      if (e.type === "completion" && e.totalTokens != null) return sum + e.totalTokens;
      return sum;
    }, 0);

    const estimatedCost = this._session.events.reduce((sum: number, e: AIEvent) => {
      if (e.type === "completion" && e.estimatedCost != null) return sum + e.estimatedCost;
      return sum;
    }, 0);

    const endEvent: AIEvent = {
      id: generateId(),
      sessionId: this._session.id,
      type: "session-ended",
      timestamp: endedAt,
      durationMs,
      totalEvents: this._session.events.length + 1,
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
      estimatedCost: estimatedCost > 0 ? estimatedCost : undefined,
    };

    this._session = {
      ...this._session,
      status: "ended",
      endedAt,
      events: [...this._session.events, endEvent],
    };

    this._emit(endEvent);
    return this._session;
  }

  // Subscribe to recorded events as they happen
  subscribe(listener: RecorderListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _emit(event: AIEvent): void {
    this._listeners.forEach((l) => l(event));
  }
}
