import { BaseEvent } from "./Event";

export interface SessionEndedEvent extends BaseEvent {
  type: "session-ended";
  durationMs: number;
  totalEvents: number;
  totalTokens?: number;
  estimatedCost?: number;
}
