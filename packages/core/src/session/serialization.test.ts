import { describe, it, expect } from "vitest";
import { serializeSession, deserializeSession, parseFlightFile } from "./serialization";
import type { Session } from "./Session";

function makeEndedSession(overrides: Partial<Session> = {}): Session {
  const startedAt = 1000;
  const endedAt = 2000;
  return {
    id: "s1",
    status: "ended",
    startedAt,
    endedAt,
    events: [
      { id: "e1", sessionId: "s1", type: "session-started", timestamp: startedAt },
      { id: "e2", sessionId: "s1", type: "session-ended", timestamp: endedAt, durationMs: 1000, totalEvents: 2 },
    ],
    ...overrides,
  };
}

describe("serializeSession", () => {
  it("produces valid JSON with version envelope", () => {
    const session = makeEndedSession();
    const json = serializeSession(session);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1");
    expect(parsed.exportedAt).toBeTypeOf("number");
    expect(parsed.session.id).toBe("s1");
  });

  it("throws if session is not ended", () => {
    const session = makeEndedSession({ status: "recording", endedAt: undefined });
    expect(() => serializeSession(session)).toThrow();
  });
});

describe("deserializeSession", () => {
  it("roundtrips a session through serialize and deserialize", () => {
    const session = makeEndedSession();
    const json = serializeSession(session);
    const restored = deserializeSession(json);
    expect(restored.id).toBe(session.id);
    expect(restored.status).toBe("ended");
    expect(restored.events).toHaveLength(session.events.length);
  });

  it("throws on invalid JSON", () => {
    expect(() => deserializeSession("not json")).toThrow();
  });

  it("throws on wrong version", () => {
    const session = makeEndedSession();
    const obj = JSON.parse(serializeSession(session));
    obj.version = "99";
    expect(() => deserializeSession(JSON.stringify(obj))).toThrow();
  });

  it("throws when exportedAt is missing", () => {
    const session = makeEndedSession();
    const obj = JSON.parse(serializeSession(session));
    delete obj.exportedAt;
    expect(() => deserializeSession(JSON.stringify(obj))).toThrow();
  });
});

describe("parseFlightFile", () => {
  it("returns a FlightFile for valid input", () => {
    const session = makeEndedSession();
    const json = serializeSession(session);
    const file = parseFlightFile(json);
    expect(file.version).toBe("1");
    expect(file.session).toBeDefined();
  });

  it("throws when session field is missing", () => {
    const obj = { version: "1", exportedAt: Date.now() };
    expect(() => parseFlightFile(JSON.stringify(obj))).toThrow();
  });
});
