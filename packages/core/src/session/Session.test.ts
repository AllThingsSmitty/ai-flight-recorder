import { describe, it, expect } from "vitest";
import { sessionDurationMs, sessionTotalTokens, sessionEstimatedCost } from "./Session";
import type { Session } from "./Session";
import type { AIEvent } from "../events/AIEvent";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    status: "ended",
    startedAt: 1000,
    endedAt: 2000,
    events: [],
    ...overrides,
  };
}

function makeCompletion(overrides: Partial<AIEvent & { type: "completion" }> = {}): AIEvent {
  return {
    id: "e1",
    sessionId: "s1",
    type: "completion",
    timestamp: 1500,
    response: "ok",
    finishReason: "stop",
    ...overrides,
  } as AIEvent;
}

describe("sessionDurationMs", () => {
  it("returns endedAt minus startedAt when endedAt is set", () => {
    const session = makeSession({ startedAt: 1000, endedAt: 3000 });
    expect(sessionDurationMs(session)).toBe(2000);
  });

  it("falls back to last event timestamp when endedAt is absent", () => {
    const session = makeSession({
      endedAt: undefined,
      events: [{ id: "e1", sessionId: "s1", type: "prompt", timestamp: 1800, model: "gpt-4o", prompt: "hi" }],
    });
    expect(sessionDurationMs(session)).toBe(800);
  });

  it("returns 0 when no endedAt and no events", () => {
    const session = makeSession({ endedAt: undefined, events: [] });
    expect(sessionDurationMs(session)).toBe(0);
  });
});

describe("sessionTotalTokens", () => {
  it("sums totalTokens across completion events", () => {
    const session = makeSession({
      events: [
        makeCompletion({ id: "e1", totalTokens: 10 }),
        makeCompletion({ id: "e2", totalTokens: 25 }),
      ],
    });
    expect(sessionTotalTokens(session)).toBe(35);
  });

  it("ignores completion events without totalTokens", () => {
    const session = makeSession({
      events: [makeCompletion({ id: "e1", totalTokens: undefined })],
    });
    expect(sessionTotalTokens(session)).toBe(0);
  });

  it("ignores non-completion events", () => {
    const session = makeSession({
      events: [{ id: "e1", sessionId: "s1", type: "prompt", timestamp: 1500, model: "gpt-4o", prompt: "hi" }],
    });
    expect(sessionTotalTokens(session)).toBe(0);
  });
});

describe("sessionEstimatedCost", () => {
  it("sums estimatedCost across completion events", () => {
    const session = makeSession({
      events: [
        makeCompletion({ id: "e1", estimatedCost: 0.001 }),
        makeCompletion({ id: "e2", estimatedCost: 0.002 }),
      ],
    });
    expect(sessionEstimatedCost(session)).toBeCloseTo(0.003);
  });

  it("ignores completion events without estimatedCost", () => {
    const session = makeSession({
      events: [makeCompletion({ id: "e1", estimatedCost: undefined })],
    });
    expect(sessionEstimatedCost(session)).toBe(0);
  });
});
