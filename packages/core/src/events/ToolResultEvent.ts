import { BaseEvent } from "./Event";

export interface ToolResultEvent extends BaseEvent {
  type: "tool-result";

  toolCallId: string;

  output: unknown;

  success: boolean;

  durationMs?: number;
}
