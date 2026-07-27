import { describe, it, expect, vi, afterEach } from "vitest";
import { ConsoleLogPlugin } from "./ConsoleLogPlugin";
import type { Session, AIEvent } from "@ai-flight-recorder/core";

function makeSession(label?: string, extraEvents: AIEvent[] = []): Session {
  return { id: "s1", status: "recording", startedAt: 1000, events: extraEvents, label };
}

function makeEvent(type: AIEvent["type"], overrides: object = {}): AIEvent {
  return { id: "e1", sessionId: "s1", type, timestamp: 1500, ...overrides } as AIEvent;
}

function makeEndedSession(label?: string): Session {
  return {
    id: "s1",
    status: "ended",
    startedAt: 1000,
    endedAt: 2000,
    label,
    events: [
      { id: "e1", sessionId: "s1", type: "session-started", timestamp: 1000 },
      { id: "e2", sessionId: "s1", type: "session-ended", timestamp: 2000, durationMs: 1000, totalEvents: 2, totalTokens: 42 },
    ],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("ConsoleLogPlugin", () => {
  it("has name 'console-log'", () => {
    expect(new ConsoleLogPlugin().name).toBe("console-log");
  });

  describe("onSessionStart", () => {
    it("logs the session label", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin();
      plugin.onSessionStart?.(makeSession("my-chat"));
      expect(log).toHaveBeenCalledOnce();
      expect(log.mock.calls[0][0]).toContain("my-chat");
    });

    it("logs the session id when no label", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin();
      plugin.onSessionStart?.(makeSession());
      expect(log.mock.calls[0][0]).toContain("s1");
    });
  });

  describe("onEvent", () => {
    it("logs prompt events", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin({ logEvents: true });
      plugin.onEvent?.(makeEvent("prompt", { model: "gpt-4o", prompt: "hello" }));
      expect(log).toHaveBeenCalledOnce();
    });

    it("skips session-started and session-ended events", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin({ logEvents: true });
      plugin.onEvent?.(makeEvent("session-started"));
      plugin.onEvent?.(makeEvent("session-ended", { durationMs: 100, totalEvents: 1 }));
      expect(log).not.toHaveBeenCalled();
    });

    it("respects the filter option", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin({ logEvents: true, filter: ["completion"] });
      plugin.onEvent?.(makeEvent("prompt", { model: "gpt-4o", prompt: "hi" }));
      expect(log).not.toHaveBeenCalled();
    });

    it("does not log when logEvents is false", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin({ logEvents: false });
      plugin.onEvent?.(makeEvent("prompt", { model: "gpt-4o", prompt: "hi" }));
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe("onSessionEnd", () => {
    it("logs a summary by default", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin();
      plugin.onSessionEnd?.(makeEndedSession("my-chat"));
      expect(log).toHaveBeenCalledOnce();
    });

    it("skips summary when logSummary is false", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const plugin = new ConsoleLogPlugin({ logSummary: false });
      plugin.onSessionEnd?.(makeEndedSession());
      expect(log).not.toHaveBeenCalled();
    });
  });
});
