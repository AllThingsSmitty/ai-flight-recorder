import { BaseEvent } from "./Event";

export interface McpServerConnectedEvent extends BaseEvent {
  type: "mcp-server-connected";

  serverName: string;

  serverVersion?: string;

  transport: "stdio" | "sse" | "http";
}
