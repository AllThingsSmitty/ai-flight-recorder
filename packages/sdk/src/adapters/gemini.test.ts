import { describe, it, expect, vi, afterEach } from "vitest";
import { wrapGeminiModel } from "./gemini";
import type { Recorder } from "@ai-flight-recorder/core";
import type { GeminiModelLike, GeminiGenerateContentResult } from "./gemini";

function makeRecorder(recording = true): Recorder {
  return {
    session: recording ? { id: "s1", status: "recording" as const, startedAt: 0, events: [] } : null,
    record: vi.fn(),
  } as unknown as Recorder;
}

function makeResult(text: string, finishReason = "STOP", usage = { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 }): GeminiGenerateContentResult {
  return {
    response: {
      text: () => text,
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
      usageMetadata: usage,
    },
  };
}

describe("wrapGeminiModel", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("generateContent", () => {
    it("records prompt and completion for a string request", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue(makeResult("Hello")),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent("Say hello");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", model: "gemini-1.5-pro", prompt: "Say hello" })
      );
      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completion", response: "Hello", finishReason: "stop" })
      );
    });

    it("extracts prompt text from a GeminiContent parts array", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue(makeResult("ok")),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent({ parts: [{ text: "Hello" }, { text: " world" }] });

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", prompt: "Hello world" })
      );
    });

    it("extracts prompt text from a GeminiContent array", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue(makeResult("ok")),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent([
        { role: "user", parts: [{ text: "Hello" }] },
        { role: "model", parts: [{ text: "Hi there" }] },
      ]);

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "prompt", prompt: "Hello\nHi there" })
      );
    });

    it("records tool-call event for functionCall parts", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => "",
            candidates: [{
              content: { parts: [{ functionCall: { name: "get_weather", args: { city: "London" } } }] },
              finishReason: "STOP",
            }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          },
        }),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent("Weather in London?");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool-call",
          toolName: "get_weather",
          toolCallId: expect.stringContaining("gemini-fn-"),
          input: { city: "London" },
        })
      );
    });

    it("maps finishReason correctly", async () => {
      const cases: Array<[string, string]> = [
        ["STOP", "stop"],
        ["MAX_TOKENS", "length"],
        ["SAFETY", "error"],
        ["RECITATION", "error"],
        ["OTHER", "unknown"],
      ];

      for (const [finishReason, expected] of cases) {
        const recorder = makeRecorder();
        const model: GeminiModelLike = {
          model: "gemini-1.5-pro",
          generateContent: vi.fn().mockResolvedValue(makeResult("x", finishReason)),
          generateContentStream: vi.fn(),
        };
        await wrapGeminiModel(model, recorder).generateContent("x");
        expect(recorder.record).toHaveBeenCalledWith(
          expect.objectContaining({ type: "completion", finishReason: expected })
        );
      }
    });

    it("includes token usage in completion event", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue(
          makeResult("hi", "STOP", { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 })
        ),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent("hello");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "completion",
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        })
      );
    });

    it("records error event and rethrows on API failure", async () => {
      const recorder = makeRecorder();
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockRejectedValue(new Error("API error")),
        generateContentStream: vi.fn(),
      };

      await expect(wrapGeminiModel(model, recorder).generateContent("hello")).rejects.toThrow("API error");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "API error" })
      );
    });

    it("skips recording when no active session", async () => {
      const recorder = makeRecorder(false);
      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn().mockResolvedValue(makeResult("ok")),
        generateContentStream: vi.fn(),
      };

      await wrapGeminiModel(model, recorder).generateContent("hello");

      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("generateContentStream", () => {
    it("records prompt, emits token events per chunk, and records completion", async () => {
      const recorder = makeRecorder();
      const chunks: GeminiGenerateContentResult[] = [
        { response: { text: () => "Hello", candidates: undefined, usageMetadata: undefined } },
        { response: { text: () => " world", candidates: undefined, usageMetadata: undefined } },
      ];
      const finalResponse = {
        text: () => "Hello world",
        candidates: [{ content: { parts: [{ text: "Hello world" }] }, finishReason: "STOP" }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 8, totalTokenCount: 13 },
      };
      async function* makeChunks() { for (const c of chunks) yield c; }

      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn(),
        generateContentStream: vi.fn().mockResolvedValue({
          stream: makeChunks(),
          response: Promise.resolve(finalResponse),
        }),
      };

      const result = await wrapGeminiModel(model, recorder).generateContentStream("hi");
      const yielded: GeminiGenerateContentResult[] = [];
      for await (const chunk of result.stream) yielded.push(chunk);

      expect(yielded).toHaveLength(2);

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(recorded.find((c) => c.type === "prompt")).toMatchObject({ type: "prompt", model: "gemini-1.5-pro" });

      const tokens = recorded.filter((c) => c.type === "token");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "token", token: "Hello", index: 0 });
      expect(tokens[1]).toMatchObject({ type: "token", token: " world", index: 1 });

      expect(recorded.find((c) => c.type === "completion")).toMatchObject({
        type: "completion",
        finishReason: "stop",
        promptTokens: 5,
        completionTokens: 8,
        totalTokens: 13,
      });
    });

    it("skips token recording for empty text chunks", async () => {
      const recorder = makeRecorder();
      const chunks: GeminiGenerateContentResult[] = [
        { response: { text: () => "", candidates: undefined, usageMetadata: undefined } },
        { response: { text: () => "hi", candidates: undefined, usageMetadata: undefined } },
      ];
      async function* makeChunks() { for (const c of chunks) yield c; }

      const model: GeminiModelLike = {
        model: "gemini-1.5-flash",
        generateContent: vi.fn(),
        generateContentStream: vi.fn().mockResolvedValue({
          stream: makeChunks(),
          response: Promise.resolve({
            text: () => "hi",
            candidates: [{ content: { parts: [] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 1, totalTokenCount: 3 },
          }),
        }),
      };

      const result = await wrapGeminiModel(model, recorder).generateContentStream("hi");
      for await (const _ of result.stream) { /* exhaust */ }

      const recorded = (recorder.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      const tokens = recorded.filter((c) => c.type === "token");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ token: "hi" });
    });

    it("records error event when stream throws and rethrows", async () => {
      const recorder = makeRecorder();
      const err = new Error("stream failure");
      async function* failingStream(): AsyncGenerator<GeminiGenerateContentResult> {
        yield { response: { text: () => "partial", candidates: undefined, usageMetadata: undefined } };
        throw err;
      }

      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn(),
        generateContentStream: vi.fn().mockResolvedValue({
          stream: failingStream(),
          response: Promise.resolve({ text: () => "", candidates: [], usageMetadata: undefined }),
        }),
      };

      const result = await wrapGeminiModel(model, recorder).generateContentStream("hi");

      await expect(async () => {
        for await (const _ of result.stream) { /* exhaust */ }
      }).rejects.toThrow("stream failure");

      expect(recorder.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "stream failure" })
      );
    });

    it("skips recording when no active session but still yields chunks", async () => {
      const recorder = makeRecorder(false);
      const chunks: GeminiGenerateContentResult[] = [
        { response: { text: () => "hi", candidates: undefined, usageMetadata: undefined } },
      ];
      async function* makeChunks() { for (const c of chunks) yield c; }

      const model: GeminiModelLike = {
        model: "gemini-1.5-pro",
        generateContent: vi.fn(),
        generateContentStream: vi.fn().mockResolvedValue({
          stream: makeChunks(),
          response: Promise.resolve({ text: () => "hi", candidates: [], usageMetadata: undefined }),
        }),
      };

      const result = await wrapGeminiModel(model, recorder).generateContentStream("hi");
      const yielded: GeminiGenerateContentResult[] = [];
      for await (const chunk of result.stream) yielded.push(chunk);

      expect(yielded).toHaveLength(1);
      expect(recorder.record).not.toHaveBeenCalled();
    });
  });
});
