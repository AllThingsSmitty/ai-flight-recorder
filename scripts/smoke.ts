/**
 * SDK smoke test — exercises recording, plugins, transport, serialization,
 * and replay end-to-end without a real AI provider.
 *
 * Requires a build first:  pnpm build
 * Run with:                pnpm smoke
 */

import assert from "node:assert/strict";
import {
  FlightRecorder,
  ConsoleLogPlugin,
  InMemoryTransport,
  serializeSession,
  deserializeSession,
  parseFlightFile,
  FLIGHT_FILE_VERSION,
} from "@flight-recorder/sdk";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const HEAD = "\x1b[36m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ${PASS} ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ${FAIL} ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ${PASS} ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ${FAIL} ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

console.log(`\n${HEAD}AI Flight Recorder — SDK smoke test${RESET}\n`);

const transport = new InMemoryTransport();
const log: string[] = [];

const fr = new FlightRecorder({
  plugins: [
    new ConsoleLogPlugin({ logEvents: false, logSummary: false }),
    // Inline plugin to capture lifecycle calls
    {
      name: "test-spy",
      onSessionStart: () => log.push("start"),
      onEvent: (e) => log.push(e.type),
      onSessionEnd: () => log.push("end"),
    },
  ],
  transport,
});

// ── Test 1: Recording ─────────────────────────────────────────────────────────

console.log(`${HEAD}1. Recording${RESET}`);

test("startSession returns a recording session", () => {
  const s = fr.startSession({ label: "smoke", tags: ["test"] });
  assert.equal(s.status, "recording");
  assert.equal(s.label, "smoke");
});

test("record() accepts all core event types", () => {
  fr.record({ type: "prompt", model: "gpt-4o", prompt: "What is 2 + 2?" });
  fr.record({ type: "token", token: "The", index: 0 });
  fr.record({ type: "token", token: " answer", index: 1 });
  fr.record({ type: "token", token: " is 4.", index: 2 });
  fr.record({
    type: "tool-call",
    toolName: "calculator",
    toolCallId: "call_abc",
    input: { expression: "2+2" },
  });
  fr.record({
    type: "tool-result",
    toolCallId: "call_abc",
    output: 4,
    success: true,
    durationMs: 8,
  });
  fr.record({
    type: "completion",
    response: "The answer is 4.",
    finishReason: "stop",
    promptTokens: 14,
    completionTokens: 6,
    totalTokens: 20,
    estimatedCost: 0.000_1,
  });

  assert.equal(fr.session?.events.length, 8); // session-started + 7 events
});

test("endSession returns an ended session", () => {
  const ended = fr.endSession();
  assert.equal(ended.status, "ended");
  // session-started + 7 events + session-ended
  assert.equal(ended.events.length, 9);
});

// ── Test 2: Plugins ───────────────────────────────────────────────────────────

console.log(`\n${HEAD}2. Plugin lifecycle${RESET}`);

test("onSessionStart called once", () => {
  assert.equal(log.filter((l) => l === "start").length, 1);
});

test("onEvent called for every event including session-started/ended", () => {
  // session-started, 7 events, session-ended
  assert.equal(log.filter((l) => l !== "start" && l !== "end").length, 9);
});

test("onSessionEnd called once", () => {
  assert.equal(log.filter((l) => l === "end").length, 1);
});

test("duplicate plugin name is rejected", () => {
  const before = (fr as unknown as { _plugins: unknown[] })._plugins.length;
  fr.use({ name: "test-spy", onEvent: () => {} });
  const after = (fr as unknown as { _plugins: unknown[] })._plugins.length;
  assert.equal(before, after, "Should not have added a duplicate plugin");
});

test("use() is chainable", () => {
  const result = fr.use({ name: "noop-plugin" });
  assert.equal(result, fr);
});

// ── Test 3: Transport ─────────────────────────────────────────────────────────

console.log(`\n${HEAD}3. Transport${RESET}`);

test("InMemoryTransport received the session on endSession()", () => {
  assert.equal(transport.size, 1);
});

test("transport.get() returns the session by ID", () => {
  const session = fr.session!;
  const retrieved = transport.get(session.id);
  assert.ok(retrieved);
  assert.equal(retrieved.label, "smoke");
  assert.equal(retrieved.events.length, 9);
});

test("transport.getAll() returns all sessions", () => {
  const all = transport.getAll();
  assert.equal(all.length, 1);
});

// ── Test 4: Serialization ─────────────────────────────────────────────────────

console.log(`\n${HEAD}4. Serialization (.flight format)${RESET}`);

const ended = fr.session!;
let json = "";

test("serializeSession() produces valid JSON", () => {
  json = serializeSession(ended);
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, FLIGHT_FILE_VERSION);
  assert.ok(typeof parsed.exportedAt === "number");
  assert.ok(parsed.session);
});

test("deserializeSession() round-trips id and event count", () => {
  const restored = deserializeSession(json);
  assert.equal(restored.id, ended.id);
  assert.equal(restored.events.length, ended.events.length);
  assert.equal(restored.label, ended.label);
});

test("parseFlightFile() exposes exportedAt metadata", () => {
  const file = parseFlightFile(json);
  assert.ok(file.exportedAt > 0);
  assert.equal(file.version, FLIGHT_FILE_VERSION);
});

test("deserializeSession() rejects invalid JSON", () => {
  assert.throws(() => deserializeSession("not json"), /not valid JSON/);
});

test("deserializeSession() rejects wrong version", () => {
  const bad = JSON.stringify({ version: "999", exportedAt: Date.now(), session: ended });
  assert.throws(() => deserializeSession(bad), /Unsupported .flight file version/);
});

test("serializeSession() rejects in-progress sessions", () => {
  const fr2 = new FlightRecorder();
  fr2.startSession();
  assert.throws(() => serializeSession(fr2.session!), /still recording/);
});

// ── Test 5: Replay engine ─────────────────────────────────────────────────────

async function runReplayTests() {
  console.log(`\n${HEAD}5. Replay engine${RESET}`);

  await testAsync("plays all events and fires 'ended'", () => {
    const replay = fr.createReplay(ended);
    let emitted = 0;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Replay timed out after 10s")),
        10_000
      );

      replay.on("event", () => emitted++);
      replay.on("ended", () => {
        clearTimeout(timeout);
        try {
          assert.equal(emitted, ended.events.length, "Event count mismatch");
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      replay.setSpeed(8);
      replay.play();
    });
  });

  await testAsync("seek() jumps to a position", () => {
    const replay = fr.createReplay(ended);
    const duration = ended.endedAt! - ended.startedAt;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Seek replay timed out")),
        10_000
      );

      replay.on("ended", () => {
        clearTimeout(timeout);
        resolve();
      });

      replay.setSpeed(8);
      replay.seek(duration * 0.5);
      replay.play();
    });
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log();
  if (failed === 0) {
    console.log(`\x1b[32m✅ All ${passed} tests passed\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m❌ ${failed} test(s) failed, ${passed} passed\x1b[0m\n`);
    process.exit(1);
  }
}

runReplayTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
