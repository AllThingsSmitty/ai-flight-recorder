import { BaseEvent } from "./Event";

export interface McpServerDisconnectedEvent extends BaseEvent {
  type: "mcp-server-disconnected";

  serverName: string;

  reason?: string;
}
