/**
 * OpenAI adapter — wraps an OpenAI client so every chat completion is
 * automatically recorded into the active Flight Recorder session.
 *
 * Usage:
 *   import OpenAI from "openai";
 *   import { FlightRecorder } from "@ai-flight-recorder/sdk";
 *   import { wrapOpenAI } from "@ai-flight-recorder/sdk/adapters/openai";
 *
 *   const recorder = new FlightRecorder();
 *   const openai   = wrapOpenAI(new OpenAI(), recorder);
 *   recorder.startSession({ label: "my-chat" });
 *
 *   // All chat.completions.create calls now auto-record
 *   const response = await openai.chat.completions.create({ ... });
 *   recorder.endSession();
 *
 * Limitation: streaming wrappers return an AsyncGenerator, not the full
 * OpenAI Stream object. Use `for await` as normal; .on() / .done() are
 * not available on the wrapped stream.
 */

import type { Recorder } from "@ai-flight-recorder/core";
import { estimateCost } from "./pricing";

// ── Minimal interface types (no hard dep on "openai" package) ─────────────────

export interface OAIMessage {
  role: "system" | "user" | "assistant" | "tool" | string;
  content: string | null;
  name?: string;
  tool_call_id?: string;
}

export interface OAITool {
  type: "function";
  function: { name: string; description?: string; parameters?: unknown };
}

export interface OAIChatCreateParams {
  model: string;
  messages: OAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: OAITool[];
  tool_choice?: unknown;
  [key: string]: unknown;
}

interface OAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface OAIChatCompletion {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string | null; tool_calls?: OAIToolCall[] };
    finish_reason: string;
    index: number;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface OAIChatCompletionChunk {
  id: string;
  model: string;
  choices: Array<{
    delta: {
      content?: string | null;
      role?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason: string | null;
    index: number;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

export interface OpenAIClientLike {
  chat: {
    completions: {
      create(params: OAIChatCreateParams): Promise<OAIChatCompletion | AsyncIterable<OAIChatCompletionChunk>>;
    };
  };
  [key: string]: unknown;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Returns a wrapped OpenAI client. All other methods are forwarded to the
 * original. Only `chat.completions.create` is intercepted.
 */
export function wrapOpenAI<T extends OpenAIClientLike>(client: T, recorder: Recorder): T {
  return {
    ...client,
    chat: {
      ...client.chat,
      completions: {
        ...client.chat.completions,
        create: async (params: OAIChatCreateParams) =>
          _createWithRecording(client, recorder, params),
      },
    },
  } as T;
}

async function _createWithRecording(
  client: OpenAIClientLike,
  recorder: Recorder,
  params: OAIChatCreateParams
): Promise<OAIChatCompletion | AsyncGenerator<OAIChatCompletionChunk>> {
  const hasSession = recorder.session?.status === "recording";

  if (hasSession) {
    const systemMsg = params.messages.find((m) => m.role === "system");
    const userMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role}: ${m.content ?? ""}`)
      .join("\n");

    recorder.record({
      type: "prompt",
      model: params.model,
      prompt: userMessages,
      systemPrompt: systemMsg?.content ?? undefined,
      temperature: params.temperature,
      maxTokens: params.max_tokens,
    });
  }

  try {
    const result = await client.chat.completions.create(params);

    if (params.stream) {
      return _wrapStream(result as AsyncIterable<OAIChatCompletionChunk>, recorder, params.model, hasSession);
    }

    if (hasSession) {
      _recordCompletion(recorder, result as OAIChatCompletion);
    }
    return result as OAIChatCompletion;
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
  stream: AsyncIterable<OAIChatCompletionChunk>,
  recorder: Recorder,
  model: string,
  hasSession: boolean
): AsyncGenerator<OAIChatCompletionChunk> {
  let tokenIndex = 0;
  let assembled = "";
  let finishReason = "stop";
  let usage: OAIChatCompletion["usage"];
  // tool_calls are assembled across chunks (arguments stream in pieces)
  const toolCallBuffer = new Map<number, { id: string; name: string; args: string }>();

  try {
    for await (const chunk of stream) {
      yield chunk;

      if (!hasSession) continue;

      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        recorder.record({ type: "token", token: delta.content, index: tokenIndex++ });
        assembled += delta.content;
      }

      for (const tc of delta.tool_calls ?? []) {
        const buf = toolCallBuffer.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) buf.id = tc.id;
        if (tc.function?.name) buf.name += tc.function.name;
        if (tc.function?.arguments) buf.args += tc.function.arguments;
        toolCallBuffer.set(tc.index, buf);
      }

      if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
      if (chunk.usage) usage = chunk.usage;
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

  for (const [, tc] of toolCallBuffer) {
    if (tc.id) {
      recorder.record({
        type: "tool-call",
        toolName: tc.name,
        toolCallId: tc.id,
        input: _tryParseJson(tc.args),
      });
    }
  }

  recorder.record({
    type: "completion",
    response: assembled,
    finishReason: _mapFinishReason(finishReason),
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    estimatedCost:
      usage ? estimateCost(model, usage.prompt_tokens, usage.completion_tokens) : undefined,
  });
}

function _recordCompletion(recorder: Recorder, response: OAIChatCompletion): void {
  const choice = response.choices[0];
  if (!choice) return;

  for (const tc of choice.message.tool_calls ?? []) {
    recorder.record({
      type: "tool-call",
      toolName: tc.function.name,
      toolCallId: tc.id,
      input: _tryParseJson(tc.function.arguments),
    });
  }

  recorder.record({
    type: "completion",
    response: choice.message.content ?? "",
    finishReason: _mapFinishReason(choice.finish_reason),
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
    estimatedCost: response.usage
      ? estimateCost(response.model, response.usage.prompt_tokens, response.usage.completion_tokens)
      : undefined,
  });
}

function _mapFinishReason(
  reason: string
): "stop" | "length" | "tool-call" | "error" | "unknown" {
  switch (reason) {
    case "stop":        return "stop";
    case "length":      return "length";
    case "tool_calls":  return "tool-call";
    case "content_filter": return "error";
    default:            return "unknown";
  }
}

function _tryParseJson(str: string): unknown {
  try { return JSON.parse(str); } catch { return str; }
}
