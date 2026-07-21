import { CompletionEvent } from "./CompletionEvent";
import { ErrorEvent } from "./ErrorEvent";
import { McpServerConnectedEvent } from "./McpServerConnectedEvent";
import { McpServerDisconnectedEvent } from "./McpServerDisconnectedEvent";
import { McpToolCallEvent } from "./McpToolCallEvent";
import { McpToolResultEvent } from "./McpToolResultEvent";
import { McpToolsListedEvent } from "./McpToolsListedEvent";
import { PromptEvent } from "./PromptEvent";
import { SessionEndedEvent } from "./SessionEndedEvent";
import { SessionStartedEvent } from "./SessionStartedEvent";
import { TokenEvent } from "./TokenEvent";
import { ToolCallEvent } from "./ToolCallEvent";
import { ToolResultEvent } from "./ToolResultEvent";

export type AIEvent =
  | SessionStartedEvent
  | SessionEndedEvent
  | PromptEvent
  | TokenEvent
  | ToolCallEvent
  | ToolResultEvent
  | CompletionEvent
  | ErrorEvent
  | McpServerConnectedEvent
  | McpServerDisconnectedEvent
  | McpToolsListedEvent
  | McpToolCallEvent
  | McpToolResultEvent;
