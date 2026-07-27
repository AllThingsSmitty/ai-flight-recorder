import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReplayEngine } from "./ReplayEngine";
import type { Session } from "../session/Session";

function makeEndedSession(eventOffsets: number[] = [0, 100, 200]): Session {
  const startedAt = 1000;
  const endedAt = startedAt + (eventOffsets.at(-1) ?? 0) + 100;
  return {
    id: "s1",
    status: "ended",
    startedAt,
    endedAt,
    events: eventOffsets.map((offset, i) => ({
      id: `e${i}`,
      sessionId: "s1",
      type: "prompt" as const,
      timestamp: startedAt + offset,
      model: "gpt-4o",
      prompt: `msg ${i}`,
    })),
  };
}

describe("ReplayEngine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("constructor", () => {
    it("throws for a non-ended session", () => {
      const session = { ...makeEndedSession(), status: "recording" as const, endedAt: undefined };
      expect(() => new ReplayEngine(session)).toThrow("ended");
    });

    it("initialises to idle state", () => {
      const engine = new ReplayEngine(makeEndedSession());
      const state = engine.getState();
      expect(state.status).toBe("idle");
      expect(state.currentTime).toBe(0);
      expect(state.speed).toBe(1);
      expect(state.eventIndex).toBe(0);
    });

    it("computes duration from endedAt", () => {
      const session = makeEndedSession();
      const engine = new ReplayEngine(session);
      expect(engine.getState().duration).toBe(session.endedAt! - session.startedAt);
    });
  });

  describe("play / pause", () => {
    it("transitions to playing on play()", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.play();
      expect(engine.getState().status).toBe("playing");
    });

    it("transitions to paused on pause()", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.play();
      engine.pause();
      expect(engine.getState().status).toBe("paused");
    });

    it("does nothing if play() is called while already playing", () => {
      const engine = new ReplayEngine(makeEndedSession());
      const onChange = vi.fn();
      engine.on("stateChange", onChange);
      engine.play();
      const callsBefore = onChange.mock.calls.length;
      engine.play();
      expect(onChange.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("seek", () => {
    it("clamps to 0 for negative input", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.seek(-500);
      expect(engine.getState().currentTime).toBe(0);
    });

    it("clamps to duration for values exceeding it", () => {
      const session = makeEndedSession();
      const engine = new ReplayEngine(session);
      engine.seek(999999);
      expect(engine.getState().currentTime).toBe(engine.getState().duration);
    });

    it("pauses if not already playing", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.seek(50);
      expect(engine.getState().status).toBe("paused");
    });
  });

  describe("setSpeed", () => {
    it("updates the speed", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.setSpeed(2);
      expect(engine.getState().speed).toBe(2);
    });
  });

  describe("reset", () => {
    it("returns to idle with currentTime 0", () => {
      const engine = new ReplayEngine(makeEndedSession());
      engine.play();
      engine.reset();
      const state = engine.getState();
      expect(state.status).toBe("idle");
      expect(state.currentTime).toBe(0);
      expect(state.eventIndex).toBe(0);
    });
  });

  describe("events", () => {
    it("emits events during playback", () => {
      const session = makeEndedSession([0, 100, 200]);
      const engine = new ReplayEngine(session);
      const received: string[] = [];
      engine.on("event", (e) => received.push(e.id));
      engine.play();
      vi.runAllTimers();
      expect(received).toEqual(["e0", "e1", "e2"]);
    });

    it("emits ended when all events are replayed", () => {
      const engine = new ReplayEngine(makeEndedSession([0]));
      const onEnded = vi.fn();
      engine.on("ended", onEnded);
      engine.play();
      vi.runAllTimers();
      expect(onEnded).toHaveBeenCalledOnce();
    });

    it("on() returns an unsubscribe function", () => {
      const engine = new ReplayEngine(makeEndedSession([0, 100]));
      const handler = vi.fn();
      const off = engine.on("event", handler);
      off();
      engine.play();
      vi.runAllTimers();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
