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
import { AgentHandoffEvent } from "./AgentHandoffEvent";
import { AgentRunEndedEvent } from "./AgentRunEndedEvent";
import { AgentRunStartedEvent } from "./AgentRunStartedEvent";
import { AgentStepEvent } from "./AgentStepEvent";
import { RetrievalQueryEvent } from "./RetrievalQueryEvent";
import { RetrievalResultEvent } from "./RetrievalResultEvent";
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
  | McpToolResultEvent
  | RetrievalQueryEvent
  | RetrievalResultEvent
  | AgentRunStartedEvent
  | AgentRunEndedEvent
  | AgentStepEvent
  | AgentHandoffEvent;
