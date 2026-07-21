import { BaseEvent } from "./Event";

export interface AgentRunEndedEvent extends BaseEvent {
  type: "agent-run-ended";
  agentName: string;
  outcome: "success" | "failure" | "max-iterations" | "handoff";
  output?: unknown;
  durationMs?: number;
  iterations?: number;
}
