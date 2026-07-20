import { BaseEvent } from "./Event";

export interface SessionStartedEvent extends BaseEvent {
  type: "session-started";
  label?: string;
  tags?: string[];
}
