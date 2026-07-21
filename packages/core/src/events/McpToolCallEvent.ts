import { BaseEvent } from "./Event";

export interface McpToolCallEvent extends BaseEvent {
  type: "mcp-tool-call";

  serverName: string;

  toolName: string;

  toolCallId: string;

  input: unknown;
}
