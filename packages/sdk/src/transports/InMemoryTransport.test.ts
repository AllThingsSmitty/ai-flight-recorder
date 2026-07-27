import { describe, it, expect, vi } from "vitest";
import { InMemoryTransport } from "./InMemoryTransport";
import type { Session } from "@ai-flight-recorder/core";

function makeSession(id: string): Session {
  return {
    id,
    status: "ended",
    startedAt: 1000,
    endedAt: 2000,
    events: [],
  };
}

describe("InMemoryTransport", () => {
  it("save() stores a session retrievable by id", async () => {
    const transport = new InMemoryTransport();
    const session = makeSession("s1");
    await transport.save(session);
    expect(transport.get("s1")).toBe(session);
  });

  it("getAll() returns all saved sessions", async () => {
    const transport = new InMemoryTransport();
    await transport.save(makeSession("s1"));
    await transport.save(makeSession("s2"));
    expect(transport.getAll()).toHaveLength(2);
  });

  it("delete() removes a session", async () => {
    const transport = new InMemoryTransport();
    await transport.save(makeSession("s1"));
    transport.delete("s1");
    expect(transport.get("s1")).toBeUndefined();
  });

  it("clear() removes all sessions", async () => {
    const transport = new InMemoryTransport();
    await transport.save(makeSession("s1"));
    await transport.save(makeSession("s2"));
    transport.clear();
    expect(transport.getAll()).toHaveLength(0);
  });

  it("size reflects the number of stored sessions", async () => {
    const transport = new InMemoryTransport();
    expect(transport.size).toBe(0);
    await transport.save(makeSession("s1"));
    expect(transport.size).toBe(1);
  });

  it("onSave() listener is called after each save", async () => {
    const transport = new InMemoryTransport();
    const listener = vi.fn();
    transport.onSave(listener);
    const session = makeSession("s1");
    await transport.save(session);
    expect(listener).toHaveBeenCalledWith(session);
  });

  it("onSave() returns an unsubscribe function", async () => {
    const transport = new InMemoryTransport();
    const listener = vi.fn();
    const unsub = transport.onSave(listener);
    unsub();
    await transport.save(makeSession("s1"));
    expect(listener).not.toHaveBeenCalled();
  });
});
