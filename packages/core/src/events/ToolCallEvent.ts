import { BaseEvent } from "./Event";

export interface ToolCallEvent extends BaseEvent {
  type: "tool-call";

  toolName: string;

  toolCallId: string;

  input: unknown;
}
