/**
 * Anthropic adapter — wraps an Anthropic client so every messages.create call
 * is automatically recorded into the active Flight Recorder session.
 *
 * Usage:
 *   import Anthropic from "@anthropic-ai/sdk";
 *   import { FlightRecorder } from "@ai-flight-recorder/sdk";
 *   import { wrapAnthropic } from "@ai-flight-recorder/sdk/adapters/anthropic";
 *
 *   const recorder  = new FlightRecorder();
 *   const anthropic = wrapAnthropic(new Anthropic(), recorder);
 *   recorder.startSession({ label: "my-chat" });
 *
 *   const message = await anthropic.messages.create({ ... });
 *   recorder.endSession();
 *
 * Limitation: streaming wrappers return an AsyncGenerator, not the full
 * Anthropic MessageStream. Use `for await` as normal.
 */

import type { Recorder } from "@ai-flight-recorder/core";
import { estimateCost, type PricingOverrides } from "./pricing";

type RecorderArg = Recorder & { pricing?: PricingOverrides };

// ── Minimal interface types ───────────────────────────────────────────────────

type AnthropicRole = "user" | "assistant";

export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result" | string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: { type: "object"; properties?: Record<string, unknown>; required?: string[] };
}

export interface AnthropicCreateParams {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  stream?: boolean;
  temperature?: number;
  tools?: AnthropicTool[];
  [key: string]: unknown;
}

export interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | string;
  usage: { input_tokens: number; output_tokens: number };
}

// Server-sent event types for streaming
export interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: { type: string; text?: string; partial_json?: string };
  content_block?: AnthropicContentBlock;
  message?: Partial<AnthropicMessageResponse>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface AnthropicClientLike {
  messages: {
    create(params: AnthropicCreateParams): Promise<AnthropicMessageResponse | AsyncIterable<AnthropicStreamEvent>>;
  };
  [key: string]: unknown;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export function wrapAnthropic<T extends AnthropicClientLike>(client: T, recorder: RecorderArg): T {
  const { pricing } = recorder;
  return {
    ...client,
    messages: {
      ...client.messages,
      create: async (params: AnthropicCreateParams) =>
        _createWithRecording(client, recorder, params, pricing),
    },
  } as T;
}

async function _createWithRecording(
  client: AnthropicClientLike,
  recorder: Recorder,
  params: AnthropicCreateParams,
  pricing: PricingOverrides | undefined
): Promise<AnthropicMessageResponse | AsyncGenerator<AnthropicStreamEvent>> {
  const hasSession = recorder.session?.status === "recording";

  if (hasSession) {
    const promptText = params.messages
      .map((m) => {
        const content = typeof m.content === "string"
          ? m.content
          : m.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
        return `${m.role}: ${content}`;
      })
      .join("\n");

    recorder.record({
      type: "prompt",
      model: params.model,
      prompt: promptText,
      systemPrompt: params.system,
      temperature: params.temperature,
      maxTokens: params.max_tokens,
    });
  }

  try {
    const result = await client.messages.create(params);

    if (params.stream) {
      return _wrapStream(
        result as AsyncIterable<AnthropicStreamEvent>,
        recorder,
        params.model,
        hasSession,
        pricing
      );
    }

    if (hasSession) {
      _recordResponse(recorder, result as AnthropicMessageResponse, pricing);
    }
    return result as AnthropicMessageResponse;
  } catch (err) {
    if (hasSession) {
      recorder.record({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    throw err;
  }
}

async function* _wrapStream(
  stream: AsyncIterable<AnthropicStreamEvent>,
  recorder: Recorder,
  model: string,
  hasSession: boolean,
  pricing: PricingOverrides | undefined
): AsyncGenerator<AnthropicStreamEvent> {
  let tokenIndex = 0;
  let assembled = "";
  let stopReason = "end_turn";
  let inputTokens = 0;
  let outputTokens = 0;

  // current tool_use block being assembled
  let currentToolId: string | undefined;
  let currentToolName: string | undefined;
  let currentToolArgs = "";

  try {
    for await (const event of stream) {
      yield event;
      if (!hasSession) continue;

      switch (event.type) {
        case "message_start":
          if (event.message?.usage?.input_tokens) inputTokens = event.message.usage.input_tokens;
          break;

        case "content_block_start":
          if (event.content_block?.type === "tool_use") {
            currentToolId = event.content_block.id;
            currentToolName = event.content_block.name ?? "";
            currentToolArgs = "";
          }
          break;

        case "content_block_delta":
          if (event.delta?.type === "text_delta" && event.delta.text) {
            recorder.record({ type: "token", token: event.delta.text, index: tokenIndex++ });
            assembled += event.delta.text;
          }
          if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
            currentToolArgs += event.delta.partial_json;
          }
          break;

        case "content_block_stop":
          if (currentToolId && currentToolName) {
            recorder.record({
              type: "tool-call",
              toolName: currentToolName,
              toolCallId: currentToolId,
              input: _tryParseJson(currentToolArgs),
            });
            currentToolId = undefined;
            currentToolName = undefined;
            currentToolArgs = "";
          }
          break;

        case "message_delta":
          if (event.delta?.type === "message_delta") {
            stopReason = (event.delta as { stop_reason?: string }).stop_reason ?? stopReason;
          }
          if (event.usage?.output_tokens) outputTokens = event.usage.output_tokens;
          break;
      }
    }
  } catch (err) {
    if (hasSession) {
      recorder.record({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    throw err;
  }

  if (!hasSession) return;

  recorder.record({
    type: "completion",
    response: assembled,
    finishReason: _mapStopReason(stopReason),
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: estimateCost(model, inputTokens, outputTokens, pricing),
  });
}

function _recordResponse(recorder: Recorder, response: AnthropicMessageResponse, pricing: PricingOverrides | undefined): void {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.id && block.name) {
      recorder.record({
        type: "tool-call",
        toolName: block.name,
        toolCallId: block.id,
        input: block.input,
      });
    }
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  recorder.record({
    type: "completion",
    response: text,
    finishReason: _mapStopReason(response.stop_reason),
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    estimatedCost: estimateCost(
      response.model,
      response.usage.input_tokens,
      response.usage.output_tokens,
      pricing
    ),
  });
}

function _mapStopReason(
  reason: string
): "stop" | "length" | "tool-call" | "error" | "unknown" {
  switch (reason) {
    case "end_turn":
    case "stop_sequence": return "stop";
    case "max_tokens":    return "length";
    case "tool_use":      return "tool-call";
    default:              return "unknown";
  }
}

function _tryParseJson(str: string): unknown {
  try { return JSON.parse(str); } catch { return str; }
}
