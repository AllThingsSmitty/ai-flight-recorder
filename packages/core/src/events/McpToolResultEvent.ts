import { BaseEvent } from "./Event";

export interface McpToolResultEvent extends BaseEvent {
  type: "mcp-tool-result";

  serverName: string;

  toolCallId: string;

  output: unknown;

  success: boolean;

  durationMs?: number;
}
