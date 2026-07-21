import { BaseEvent } from "./Event";

export interface AgentHandoffEvent extends BaseEvent {
  type: "agent-handoff";
  fromAgent: string;
  toAgent: string;
  reason?: string;
  input?: unknown;
}
