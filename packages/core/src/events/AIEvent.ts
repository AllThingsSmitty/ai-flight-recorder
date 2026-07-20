import { CompletionEvent } from "./CompletionEvent";
import { ErrorEvent } from "./ErrorEvent";
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
  | ErrorEvent;
