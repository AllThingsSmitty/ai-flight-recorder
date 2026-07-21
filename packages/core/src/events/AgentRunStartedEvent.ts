import { BaseEvent } from "./Event";

export interface AgentRunStartedEvent extends BaseEvent {
  type: "agent-run-started";
  agentName: string;
  goal?: string;
  input?: unknown;
}
