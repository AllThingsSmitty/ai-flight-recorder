import { BaseEvent } from "./Event";

export interface McpTool {
  name: string;
  description?: string;
}

export interface McpToolsListedEvent extends BaseEvent {
  type: "mcp-tools-listed";

  serverName: string;

  tools: McpTool[];
}
