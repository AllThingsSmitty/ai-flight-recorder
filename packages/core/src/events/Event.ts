import { EventType } from "./EventType";

export interface BaseEvent {
  id: string;

  sessionId: string;

  type: EventType;

  timestamp: number;

  spanId?: string;

  parentSpanId?: string;

  metadata?: Record<string, unknown>;
}
