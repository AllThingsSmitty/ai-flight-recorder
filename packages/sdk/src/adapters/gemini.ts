/**
 * Gemini adapter — wraps a Google Generative AI model so calls to
 * generateContent / generateContentStream are automatically recorded.
 *
 * Usage:
 *   import { GoogleGenerativeAI } from "@google/generative-ai";
 *   import { FlightRecorder } from "@ai-flight-recorder/sdk";
 *   import { wrapGeminiModel } from "@ai-flight-recorder/sdk/adapters/gemini";
 *
 *   const recorder  = new FlightRecorder();
 *   const genAI     = new GoogleGenerativeAI(apiKey);
 *   const rawModel  = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
 *   const model     = wrapGeminiModel(rawModel, recorder);
 *
 *   recorder.startSession({ label: "my-chat" });
 *   const result = await model.generateContent("Hello");
 *   recorder.endSession();
 */

import type { Recorder } from "@ai-flight-recorder/core";
import { estimateCost, type PricingOverrides } from "./pricing";

type RecorderArg = Recorder & { pricing?: PricingOverrides };

// ── Minimal interface types ───────────────────────────────────────────────────

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export type GeminiContent = {
  role?: "user" | "model" | string;
  parts: GeminiPart[];
};

export type GeminiRequest = string | GeminiContent | GeminiContent[];

export interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER" | string;
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiGenerateContentResult {
  response: {
    text(): string;
    candidates?: GeminiCandidate[];
    usageMetadata?: GeminiUsageMetadata;
  };
}

export interface GeminiGenerateContentStreamResult {
  stream: AsyncIterable<GeminiGenerateContentResult>;
  response: Promise<GeminiGenerateContentResult["response"]>;
}

export interface GeminiModelLike {
  model: string;
  generateContent(request: GeminiRequest): Promise<GeminiGenerateContentResult>;
  generateContentStream(request: GeminiRequest): Promise<GeminiGenerateContentStreamResult>;
  [key: string]: unknown;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export function wrapGeminiModel<T extends GeminiModelLike>(model: T, recorder: RecorderArg): T {
  const { pricing } = recorder;
  return {
    ...model,
    generateContent: async (request: GeminiRequest) =>
      _generateWithRecording(model, recorder, request, pricing),

    generateContentStream: async (request: GeminiRequest) =>
      _generateStreamWithRecording(model, recorder, request, pricing),
  } as T;
}

async function _generateWithRecording(
  model: GeminiModelLike,
  recorder: Recorder,
  request: GeminiRequest,
  pricing: PricingOverrides | undefined
): Promise<GeminiGenerateContentResult> {
  const hasSession = recorder.session?.status === "recording";
  const promptText = _extractPromptText(request);

  if (hasSession) {
    recorder.record({
      type: "prompt",
      model: model.model,
      prompt: promptText,
    });
  }

  try {
    const result = await model.generateContent(request);

    if (hasSession) {
      _recordResult(recorder, model.model, result.response, pricing);
    }
    return result;
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

async function _generateStreamWithRecording(
  model: GeminiModelLike,
  recorder: Recorder,
  request: GeminiRequest,
  pricing: PricingOverrides | undefined
): Promise<GeminiGenerateContentStreamResult> {
  const hasSession = recorder.session?.status === "recording";
  const promptText = _extractPromptText(request);

  if (hasSession) {
    recorder.record({
      type: "prompt",
      model: model.model,
      prompt: promptText,
    });
  }

  let streamResult: GeminiGenerateContentStreamResult;
  try {
    streamResult = await model.generateContentStream(request);
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

  const modelName = model.model;

  async function* wrappedStream(): AsyncGenerator<GeminiGenerateContentResult> {
    let tokenIndex = 0;
    try {
      for await (const chunk of streamResult.stream) {
        yield chunk;
        if (!hasSession) continue;
        const text = chunk.response.text();
        if (text) {
          recorder.record({ type: "token", token: text, index: tokenIndex++ });
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

    if (hasSession) {
      const finalResponse = await streamResult.response;
      _recordResult(recorder, modelName, finalResponse, pricing);
    }
  }

  return {
    stream: wrappedStream(),
    response: streamResult.response,
  };
}

function _recordResult(
  recorder: Recorder,
  modelName: string,
  response: GeminiGenerateContentResult["response"],
  pricing: PricingOverrides | undefined
): void {
  const candidate = response.candidates?.[0];
  const usage = response.usageMetadata;

  for (const part of candidate?.content.parts ?? []) {
    if (part.functionCall) {
      recorder.record({
        type: "tool-call",
        toolName: part.functionCall.name,
        toolCallId: `gemini-fn-${Date.now()}`,
        input: part.functionCall.args,
      });
    }
  }

  recorder.record({
    type: "completion",
    response: response.text(),
    finishReason: _mapFinishReason(candidate?.finishReason),
    promptTokens: usage?.promptTokenCount,
    completionTokens: usage?.candidatesTokenCount,
    totalTokens: usage?.totalTokenCount,
    estimatedCost:
      usage?.promptTokenCount != null && usage?.candidatesTokenCount != null
        ? estimateCost(modelName, usage.promptTokenCount, usage.candidatesTokenCount, pricing)
        : undefined,
  });
}

function _extractPromptText(request: GeminiRequest): string {
  if (typeof request === "string") return request;
  if (Array.isArray(request)) {
    return request
      .map((c) => c.parts.map((p) => p.text ?? "").join(""))
      .join("\n");
  }
  return request.parts.map((p) => p.text ?? "").join("");
}

function _mapFinishReason(
  reason: string | undefined
): "stop" | "length" | "tool-call" | "error" | "unknown" {
  switch (reason) {
    case "STOP":       return "stop";
    case "MAX_TOKENS": return "length";
    case "SAFETY":
    case "RECITATION": return "error";
    default:           return "unknown";
  }
}
