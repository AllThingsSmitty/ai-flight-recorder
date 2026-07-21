export type EventType =
  | "session-started"
  | "session-ended"
  | "prompt"
  | "token"
  | "tool-call"
  | "tool-result"
  | "completion"
  | "error"
  | "mcp-server-connected"
  | "mcp-server-disconnected"
  | "mcp-tools-listed"
  | "mcp-tool-call"
  | "mcp-tool-result";
