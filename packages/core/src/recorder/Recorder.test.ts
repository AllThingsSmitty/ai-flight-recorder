import { describe, it, expect, vi } from "vitest";
import { Recorder } from "./Recorder";

describe("Recorder", () => {
  describe("startSession", () => {
    it("returns a recording session", () => {
      const recorder = new Recorder();
      const session = recorder.startSession({ label: "test" });
      expect(session.status).toBe("recording");
      expect(session.label).toBe("test");
      expect(session.events).toHaveLength(1);
      expect(session.events[0].type).toBe("session-started");
    });

    it("throws if a session is already recording", () => {
      const recorder = new Recorder();
      recorder.startSession();
      expect(() => recorder.startSession()).toThrow("A session is already recording");
    });

    it("allows starting a new session after ending the previous one", () => {
      const recorder = new Recorder();
      recorder.startSession();
      recorder.endSession();
      expect(() => recorder.startSession()).not.toThrow();
    });

    it("includes tags in the session", () => {
      const recorder = new Recorder();
      const session = recorder.startSession({ tags: ["prod", "gpt-4o"] });
      expect(session.tags).toEqual(["prod", "gpt-4o"]);
    });
  });

  describe("record", () => {
    it("returns a complete event with id, sessionId, and timestamp", () => {
      const recorder = new Recorder();
      const session = recorder.startSession();
      const event = recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
      expect(event.id).toBeTruthy();
      expect(event.sessionId).toBe(session.id);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.type).toBe("prompt");
    });

    it("appends the event to the session", () => {
      const recorder = new Recorder();
      recorder.startSession();
      recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
      expect(recorder.session?.events).toHaveLength(2);
    });

    it("throws if no session is active", () => {
      const recorder = new Recorder();
      expect(() => recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" })).toThrow(
        "No active recording session"
      );
    });

    it("throws after session has ended", () => {
      const recorder = new Recorder();
      recorder.startSession();
      recorder.endSession();
      expect(() => recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" })).toThrow(
        "No active recording session"
      );
    });
  });

  describe("endSession", () => {
    it("returns session with status ended", () => {
      const recorder = new Recorder();
      recorder.startSession();
      const session = recorder.endSession();
      expect(session.status).toBe("ended");
      expect(session.endedAt).toBeGreaterThan(0);
    });

    it("appends a session-ended event", () => {
      const recorder = new Recorder();
      recorder.startSession();
      const session = recorder.endSession();
      const lastEvent = session.events.at(-1);
      expect(lastEvent?.type).toBe("session-ended");
    });

    it("aggregates totalTokens from completion events", () => {
      const recorder = new Recorder();
      recorder.startSession();
      recorder.record({ type: "completion", response: "a", finishReason: "stop", totalTokens: 10 });
      recorder.record({ type: "completion", response: "b", finishReason: "stop", totalTokens: 20 });
      const session = recorder.endSession();
      const endEvent = session.events.at(-1);
      expect(endEvent?.type === "session-ended" && endEvent.totalTokens).toBe(30);
    });

    it("aggregates estimatedCost from completion events", () => {
      const recorder = new Recorder();
      recorder.startSession();
      recorder.record({ type: "completion", response: "a", finishReason: "stop", estimatedCost: 0.001 });
      recorder.record({ type: "completion", response: "b", finishReason: "stop", estimatedCost: 0.002 });
      const session = recorder.endSession();
      const endEvent = session.events.at(-1);
      expect(endEvent?.type === "session-ended" && endEvent.estimatedCost).toBeCloseTo(0.003);
    });

    it("throws if no session is active", () => {
      const recorder = new Recorder();
      expect(() => recorder.endSession()).toThrow("No active recording session to end");
    });
  });

  describe("subscribe", () => {
    it("calls listener for each emitted event", () => {
      const recorder = new Recorder();
      const listener = vi.fn();
      recorder.subscribe(listener);
      recorder.startSession();
      recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
      recorder.endSession();
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("returns an unsubscribe function that stops further calls", () => {
      const recorder = new Recorder();
      const listener = vi.fn();
      const unsubscribe = recorder.subscribe(listener);
      recorder.startSession();
      unsubscribe();
      recorder.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
