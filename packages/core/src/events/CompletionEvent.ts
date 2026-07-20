import { BaseEvent } from "./Event";

export interface CompletionEvent extends BaseEvent {
  type: "completion";

  response: string;

  finishReason: "stop" | "length" | "tool-call" | "error" | "unknown";

  promptTokens?: number;

  completionTokens?: number;

  totalTokens?: number;

  estimatedCost?: number;
}
