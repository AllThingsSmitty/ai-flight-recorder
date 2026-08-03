import { describe, it, expect, vi, afterEach } from "vitest";
import { wrapOpenAI } from "./openai";
import type { Recorder } from "@ai-flight-recorder/core";
import type { OpenAIClientLike, OAIChatCompletion, OAIChatCompletionChunk } from "./openai";

function makeRecorder(recording = true): Recorder {
  return {
    session: recording ? { id: "s1", status: "recording" as const, startedAt: 0, events: [] } : null,
    record: vi.fn(),
  } as unknown as Recorder;
}

function makeCompletion(
  content: string,
  finishReason = "stop",
  usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  toolCalls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>
): OAIChatCompletion {
  return {
    id: "cmpl_1",
    model: "gpt-4o",
    choices: [{ message: { role: "assistant", content, tool_calls: toolCalls }, finish_reason: finishReason, index: 0 }],
    usage,
  };
}

async function* streamOf(...chunks: OAIChatCompletionChunk[]) {
  for (const c of chunks) yield c;
}

describe("wrapOpenAI", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("non-streaming", () => {
    it("records prompt and completion for a simple response", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(makeCompletion("Hello there")) } },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", model: "gpt-4o", prompt: "user: Hello" })
      );
      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completion", response: "Hello there", finishReason: "stop" })
      );
    });

    it("extracts system prompt and excludes it from the user message string", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(makeCompletion("ok")) } },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hi" },
        ],
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", systemPrompt: "You are a helpful assistant.", prompt: "user: Hi" })
      );
    });

    it("joins multi-turn messages into a single prompt string", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(makeCompletion("Paris")) } },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: "What is the capital of France?" },
          { role: "assistant", content: "The capital is" },
        ],
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "prompt",
          prompt: "user: What is the capital of France?\nassistant: The capital is",
        })
      );
    });

    it("records tool-call events before completion for tool_calls in the response", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              makeCompletion("", "tool_calls", { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }, [
                { id: "call_1", type: "function", function: { name: "get_weather", arguments: '{"city":"Paris"}' } },
              ])
            ),
          },
        },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Weather in Paris?" }],
      });

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(recorded.find((c) => c.type === "tool-call")).toMatchObject({
        type: "tool-call",
        toolName: "get_weather",
        toolCallId: "call_1",
        input: { city: "Paris" },
      });
      expect(recorded.find((c) => c.type === "completion")).toMatchObject({
        type: "completion",
        finishReason: "tool-call",
      });
    });

    it("maps finish_reason to finishReason correctly", async () => {
      const cases: Array<[string, string]> = [
        ["stop", "stop"],
        ["length", "length"],
        ["tool_calls", "tool-call"],
        ["content_filter", "error"],
        ["other", "unknown"],
      ];

      for (const [finishReason, expected] of cases) {
        const recorder = makeRecorder();
        const client: OpenAIClientLike = {
          chat: { completions: { create: vi.fn().mockResolvedValue(makeCompletion("x", finishReason)) } },
        };
        await wrapOpenAI(client, recorder).chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: "x" }],
        });
        expect(recorder.record).toHaveBeenCalledWith(
          expect.objectContaining({ type: "completion", finishReason: expected })
        );
      }
    });

    it("includes token usage in completion event", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              makeCompletion("hi", "stop", { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 })
            ),
          },
        },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completion", promptTokens: 10, completionTokens: 5, totalTokens: 15 })
      );
    });

    it("records error event and rethrows on API failure", async () => {
      const recorder = makeRecorder();
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockRejectedValue(new Error("API error")) } },
      };

      await expect(
        wrapOpenAI(client, recorder).chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: "hello" }],
        })
      ).rejects.toThrow("API error");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "API error" })
      );
    });

    it("skips recording when no active session", async () => {
      const recorder = makeRecorder(false);
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(makeCompletion("ok")) } },
      };

      await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("streaming", () => {
    it("yields all chunks from the underlying stream", async () => {
      const recorder = makeRecorder();
      const chunks: OAIChatCompletionChunk[] = [
        { id: "c1", model: "gpt-4o", choices: [{ delta: { content: "Hello" }, finish_reason: null, index: 0 }] },
        { id: "c2", model: "gpt-4o", choices: [{ delta: { content: " world" }, finish_reason: null, index: 0 }] },
        { id: "c3", model: "gpt-4o", choices: [{ delta: {}, finish_reason: "stop", index: 0 }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } },
      ];
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(streamOf(...chunks)) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      });

      const yielded: OAIChatCompletionChunk[] = [];
      for await (const chunk of result as AsyncIterable<OAIChatCompletionChunk>) yielded.push(chunk);

      expect(yielded).toHaveLength(3);
    });

    it("records a token event for each content-bearing chunk", async () => {
      const recorder = makeRecorder();
      const chunks: OAIChatCompletionChunk[] = [
        { id: "c1", model: "gpt-4o", choices: [{ delta: { content: "Hello" }, finish_reason: null, index: 0 }] },
        { id: "c2", model: "gpt-4o", choices: [{ delta: { content: " world" }, finish_reason: null, index: 0 }] },
        { id: "c3", model: "gpt-4o", choices: [{ delta: {}, finish_reason: "stop", index: 0 }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } },
      ];
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(streamOf(...chunks)) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      });
      for await (const _ of result as AsyncIterable<OAIChatCompletionChunk>) { /* exhaust */ }

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      const tokens = recorded.filter((c) => c.type === "token");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "token", token: "Hello", index: 0 });
      expect(tokens[1]).toMatchObject({ type: "token", token: " world", index: 1 });
    });

    it("records completion with assembled text and usage after stream exhausts", async () => {
      const recorder = makeRecorder();
      const chunks: OAIChatCompletionChunk[] = [
        { id: "c1", model: "gpt-4o", choices: [{ delta: { content: "Hi" }, finish_reason: null, index: 0 }] },
        { id: "c2", model: "gpt-4o", choices: [{ delta: {}, finish_reason: "stop", index: 0 }], usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 } },
      ];
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(streamOf(...chunks)) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      });
      for await (const _ of result as AsyncIterable<OAIChatCompletionChunk>) { /* exhaust */ }

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "completion",
          response: "Hi",
          promptTokens: 8,
          completionTokens: 3,
          totalTokens: 11,
        })
      );
    });

    it("assembles tool-call from multiple delta chunks and records it", async () => {
      const recorder = makeRecorder();
      const chunks: OAIChatCompletionChunk[] = [
        {
          id: "c1", model: "gpt-4o",
          choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "get_weather", arguments: "" } }] }, finish_reason: null, index: 0 }],
        },
        {
          id: "c2", model: "gpt-4o",
          choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"city":' } }] }, finish_reason: null, index: 0 }],
        },
        {
          id: "c3", model: "gpt-4o",
          choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"Paris"}' } }] }, finish_reason: null, index: 0 }],
        },
        {
          id: "c4", model: "gpt-4o",
          choices: [{ delta: {}, finish_reason: "tool_calls", index: 0 }],
          usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
        },
      ];
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(streamOf(...chunks)) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Weather in Paris?" }],
        stream: true,
      });
      for await (const _ of result as AsyncIterable<OAIChatCompletionChunk>) { /* exhaust */ }

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool-call",
          toolName: "get_weather",
          toolCallId: "call_1",
          input: { city: "Paris" },
        })
      );
      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completion", finishReason: "tool-call" })
      );
    });

    it("records error event when stream throws and rethrows", async () => {
      const recorder = makeRecorder();
      const err = new Error("stream error");
      async function* failingStream(): AsyncGenerator<OAIChatCompletionChunk> {
        yield { id: "c1", model: "gpt-4o", choices: [{ delta: { content: "partial" }, finish_reason: null, index: 0 }] };
        throw err;
      }
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(failingStream()) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      });

      await expect(async () => {
        for await (const _ of result as AsyncIterable<OAIChatCompletionChunk>) { /* exhaust */ }
      }).rejects.toThrow("stream error");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "stream error" })
      );
    });

    it("still yields chunks when no active session", async () => {
      const recorder = makeRecorder(false);
      const chunks: OAIChatCompletionChunk[] = [
        { id: "c1", model: "gpt-4o", choices: [{ delta: { content: "Hi" }, finish_reason: null, index: 0 }] },
      ];
      const client: OpenAIClientLike = {
        chat: { completions: { create: vi.fn().mockResolvedValue(streamOf(...chunks)) } },
      };

      const result = await wrapOpenAI(client, recorder).chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      });

      const yielded: OAIChatCompletionChunk[] = [];
      for await (const chunk of result as AsyncIterable<OAIChatCompletionChunk>) yielded.push(chunk);

      expect(yielded).toHaveLength(1);
      expect(recorder.record).not.toHaveBeenCalled();
    });
  });
});
