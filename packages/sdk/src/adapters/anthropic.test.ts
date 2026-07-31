import { describe, it, expect, vi, afterEach } from "vitest";
import { wrapAnthropic } from "./anthropic";
import type { Recorder } from "@ai-flight-recorder/core";
import type { AnthropicClientLike, AnthropicStreamEvent } from "./anthropic";

function makeRecorder(recording = true): Recorder {
  return {
    session: recording ? { id: "s1", status: "recording" as const, startedAt: 0, events: [] } : null,
    record: vi.fn(),
  } as unknown as Recorder;
}

async function* streamOf(...events: AnthropicStreamEvent[]) {
  for (const e of events) yield e;
}

describe("wrapAnthropic", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("non-streaming", () => {
    it("records prompt and completion for a simple text response", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg_1",
            model: "claude-sonnet-4-5",
            content: [{ type: "text", text: "Hello there" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1024,
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", model: "claude-sonnet-4-5", prompt: "user: Hello" })
      );
      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completion", response: "Hello there", finishReason: "stop" })
      );
    });

    it("extracts prompt text from content block arrays in messages", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg_2",
            model: "claude-haiku-4-5",
            content: [{ type: "text", text: "ok" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 8, output_tokens: 2 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-haiku-4-5",
        messages: [{ role: "user", content: [{ type: "text", text: "Part one" }, { type: "image" }] }],
        max_tokens: 256,
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", prompt: "user: Part one" })
      );
    });

    it("joins multi-turn messages into a single prompt string", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg_3",
            model: "claude-sonnet-4-5",
            content: [{ type: "text", text: "Paris" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 15, output_tokens: 3 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [
          { role: "user", content: "What is the capital of France?" },
          { role: "assistant", content: "The capital is" },
        ],
        max_tokens: 256,
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "prompt",
          prompt: "user: What is the capital of France?\nassistant: The capital is",
        })
      );
    });

    it("records tool-call events before completion for tool_use blocks", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg_4",
            model: "claude-sonnet-4-5",
            content: [
              { type: "tool_use", id: "tool_1", name: "get_weather", input: { city: "Paris" } },
              { type: "text", text: "" },
            ],
            stop_reason: "tool_use",
            usage: { input_tokens: 20, output_tokens: 10 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "What is the weather?" }],
        max_tokens: 1024,
      });

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(recorded.find((c) => c.type === "tool-call")).toMatchObject({
        type: "tool-call",
        toolName: "get_weather",
        toolCallId: "tool_1",
        input: { city: "Paris" },
      });
      expect(recorded.find((c) => c.type === "completion")).toMatchObject({
        type: "completion",
        finishReason: "tool-call",
      });
    });

    it("maps stop_reason to finishReason correctly", async () => {
      const cases: Array<[string, string]> = [
        ["end_turn", "stop"],
        ["stop_sequence", "stop"],
        ["max_tokens", "length"],
        ["tool_use", "tool-call"],
        ["other", "unknown"],
      ];

      for (const [stopReason, expected] of cases) {
        const recorder = makeRecorder();
        const client: AnthropicClientLike = {
          messages: {
            create: vi.fn().mockResolvedValue({
              id: "msg",
              model: "claude-sonnet-4-5",
              content: [{ type: "text", text: "x" }],
              stop_reason: stopReason,
              usage: { input_tokens: 1, output_tokens: 1 },
            }),
          },
        };
        await wrapAnthropic(client, recorder).messages.create({
          model: "claude-sonnet-4-5",
          messages: [{ role: "user", content: "x" }],
          max_tokens: 1024,
        });
        expect(recorder.record).toHaveBeenCalledWith(
          expect.objectContaining({ type: "completion", finishReason: expected })
        );
      }
    });

    it("includes system prompt in prompt event", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg",
            model: "claude-sonnet-4-5",
            content: [{ type: "text", text: "ok" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 5, output_tokens: 2 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hello" }],
        max_tokens: 1024,
        system: "You are a helpful assistant.",
      });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", systemPrompt: "You are a helpful assistant." })
      );
    });

    it("records error event and rethrows on API failure", async () => {
      const recorder = makeRecorder();
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockRejectedValue(new Error("API error")) },
      };

      await expect(
        wrapAnthropic(client, recorder).messages.create({
          model: "claude-sonnet-4-5",
          messages: [{ role: "user", content: "hello" }],
          max_tokens: 1024,
        })
      ).rejects.toThrow("API error");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "API error" })
      );
    });

    it("skips recording when no active session", async () => {
      const recorder = makeRecorder(false);
      const client: AnthropicClientLike = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: "msg",
            model: "claude-sonnet-4-5",
            content: [{ type: "text", text: "ok" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 5, output_tokens: 2 },
          }),
        },
      };

      await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hello" }],
        max_tokens: 1024,
      });

      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("streaming", () => {
    it("yields all events from the underlying stream", async () => {
      const recorder = makeRecorder();
      const events: AnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 8 } } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: " world" } },
        { type: "message_delta", delta: { type: "message_delta" }, usage: { output_tokens: 5 } },
      ];
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(streamOf(...events)) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
        stream: true,
      });

      const yielded: AnthropicStreamEvent[] = [];
      for await (const e of result as AsyncIterable<AnthropicStreamEvent>) yielded.push(e);

      expect(yielded).toHaveLength(4);
    });

    it("records a token event for each text_delta chunk", async () => {
      const recorder = makeRecorder();
      const events: AnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 8 } } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: " world" } },
        { type: "message_delta", delta: { type: "message_delta" }, usage: { output_tokens: 5 } },
      ];
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(streamOf(...events)) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
        stream: true,
      });
      for await (const _ of result as AsyncIterable<AnthropicStreamEvent>) {}

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      const tokens = recorded.filter((c) => c.type === "token");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "token", token: "Hello", index: 0 });
      expect(tokens[1]).toMatchObject({ type: "token", token: " world", index: 1 });
    });

    it("records completion with assembled text and token counts after stream exhausts", async () => {
      const recorder = makeRecorder();
      const events: AnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 8 } } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } },
        { type: "message_delta", delta: { type: "message_delta" }, usage: { output_tokens: 3 } },
      ];
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(streamOf(...events)) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
        stream: true,
      });
      for await (const _ of result as AsyncIterable<AnthropicStreamEvent>) {}

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

    it("records tool-call when a tool_use block is fully streamed", async () => {
      const recorder = makeRecorder();
      const events: AnthropicStreamEvent[] = [
        { type: "message_start", message: { usage: { input_tokens: 10 } } },
        { type: "content_block_start", content_block: { type: "tool_use", id: "t1", name: "search" } },
        { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: '{"q":' } },
        { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: '"hello"}' } },
        { type: "content_block_stop" },
        { type: "message_delta", delta: { type: "message_delta" }, usage: { output_tokens: 8 } },
      ];
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(streamOf(...events)) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "search for hello" }],
        max_tokens: 100,
        stream: true,
      });
      for await (const _ of result as AsyncIterable<AnthropicStreamEvent>) {}

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool-call",
          toolName: "search",
          toolCallId: "t1",
          input: { q: "hello" },
        })
      );
    });

    it("records error event when stream throws and rethrows", async () => {
      const recorder = makeRecorder();
      const err = new Error("stream error");
      async function* failingStream(): AsyncGenerator<AnthropicStreamEvent> {
        yield { type: "message_start" };
        throw err;
      }
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(failingStream()) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
        stream: true,
      });

      await expect(async () => {
        for await (const _ of result as AsyncIterable<AnthropicStreamEvent>) {}
      }).rejects.toThrow("stream error");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "stream error" })
      );
    });

    it("still yields events when no active session", async () => {
      const recorder = makeRecorder(false);
      const events: AnthropicStreamEvent[] = [
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } },
      ];
      const client: AnthropicClientLike = {
        messages: { create: vi.fn().mockResolvedValue(streamOf(...events)) },
      };

      const result = await wrapAnthropic(client, recorder).messages.create({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
        stream: true,
      });

      const yielded: AnthropicStreamEvent[] = [];
      for await (const e of result as AsyncIterable<AnthropicStreamEvent>) yielded.push(e);

      expect(yielded).toHaveLength(1);
      expect(recorder.record).not.toHaveBeenCalled();
    });
  });
});
