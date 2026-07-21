import { BaseEvent } from "./Event";

export interface AgentStepEvent extends BaseEvent {
  type: "agent-step";
  agentName: string;
  stepIndex: number;
  thought?: string;
  action?: string;
  actionInput?: unknown;
}
