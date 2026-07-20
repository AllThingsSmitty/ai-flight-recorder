import { BaseEvent } from "./Event";

export interface PromptEvent extends BaseEvent {
  type: "prompt";

  prompt: string;

  model: string;

  systemPrompt?: string;

  temperature?: number;

  maxTokens?: number;
}
