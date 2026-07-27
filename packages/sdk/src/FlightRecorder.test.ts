import { describe, it, expect, vi } from "vitest";
import { FlightRecorder } from "./FlightRecorder";
import { InMemoryTransport } from "./transports/InMemoryTransport";
import type { Plugin } from "@ai-flight-recorder/core";

function makePlugin(name: string): Plugin & { calls: string[] } {
  const calls: string[] = [];
  return {
    name,
    calls,
    onSessionStart: () => calls.push("onSessionStart"),
    onEvent: () => calls.push("onEvent"),
    onSessionEnd: () => calls.push("onSessionEnd"),
  };
}

describe("FlightRecorder", () => {
  describe("use()", () => {
    it("returns this for chaining", () => {
      const fr = new FlightRecorder();
      const plugin = makePlugin("a");
      expect(fr.use(plugin)).toBe(fr);
    });

    it("skips duplicate plugin names with a warning", () => {
      const fr = new FlightRecorder();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fr.use(makePlugin("a"));
      fr.use(makePlugin("a"));
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });
  });

  describe("plugin lifecycle", () => {
    it("calls onSessionStart, onEvent, onSessionEnd in order", () => {
      const plugin = makePlugin("tracker");
      const fr = new FlightRecorder({ plugins: [plugin] });
      fr.startSession();
      fr.record({ type: "prompt", model: "gpt-4o", prompt: "hi" });
      fr.endSession();
      expect(plugin.calls).toEqual([
        "onSessionStart",
        "onEvent", // session-started
        "onEvent", // prompt
        "onEvent", // session-ended
        "onSessionEnd",
      ]);
    });

    it("does not crash if plugin methods are undefined", () => {
      const fr = new FlightRecorder({ plugins: [{ name: "minimal" }] });
      fr.startSession();
      expect(() => fr.endSession()).not.toThrow();
    });
  });

  describe("transport", () => {
    it("calls transport.save() with the ended session", async () => {
      const transport = new InMemoryTransport();
      const fr = new FlightRecorder({ transport });
      fr.startSession({ label: "saved" });
      fr.endSession();
      await vi.waitFor(() => expect(transport.getAll()).toHaveLength(1));
      expect(transport.getAll()[0].label).toBe("saved");
    });
  });

  describe("createReplay", () => {
    it("returns a ReplayEngine for an ended session", () => {
      const fr = new FlightRecorder();
      fr.startSession();
      const session = fr.endSession();
      const engine = fr.createReplay(session);
      expect(engine.getState().status).toBe("idle");
    });
  });
});
