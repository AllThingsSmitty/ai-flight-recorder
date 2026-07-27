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
  HttpTransport,
  toOtlp,
  serializeSession,
  deserializeSession,
  parseFlightFile,
  FLIGHT_FILE_VERSION,
} from "@ai-flight-recorder/sdk";

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

// ── Test 5: MCP events ────────────────────────────────────────────────────────

console.log(`\n${HEAD}5. MCP events${RESET}`);

const mcpTransport = new InMemoryTransport();
const mcpFr = new FlightRecorder({ transport: mcpTransport });

test("record() accepts mcp-server-connected", () => {
  mcpFr.startSession({ label: "mcp-smoke" });
  mcpFr.record({
    type: "mcp-server-connected",
    serverName: "filesystem",
    serverVersion: "1.0.0",
    transport: "stdio",
  });
  assert.equal(mcpFr.session?.events.length, 2); // session-started + mcp-server-connected
});

test("record() accepts mcp-tools-listed", () => {
  mcpFr.record({
    type: "mcp-tools-listed",
    serverName: "filesystem",
    tools: [
      { name: "read_file", description: "Read a file from disk" },
      { name: "write_file", description: "Write content to a file" },
    ],
  });
  assert.equal(mcpFr.session?.events.length, 3);
});

test("record() accepts mcp-tool-call", () => {
  mcpFr.record({
    type: "mcp-tool-call",
    serverName: "filesystem",
    toolName: "read_file",
    toolCallId: "mcp_call_001",
    input: { path: "/tmp/hello.txt" },
  });
  assert.equal(mcpFr.session?.events.length, 4);
});

test("record() accepts mcp-tool-result", () => {
  mcpFr.record({
    type: "mcp-tool-result",
    serverName: "filesystem",
    toolCallId: "mcp_call_001",
    output: "Hello, world!",
    success: true,
    durationMs: 12,
  });
  assert.equal(mcpFr.session?.events.length, 5);
});

test("record() accepts mcp-server-disconnected", () => {
  mcpFr.record({
    type: "mcp-server-disconnected",
    serverName: "filesystem",
    reason: "session ended",
  });
  assert.equal(mcpFr.session?.events.length, 6);
});

test("MCP session round-trips through serialization", () => {
  const mcpEnded = mcpFr.endSession();
  // session-started + 5 MCP events + session-ended
  assert.equal(mcpEnded.events.length, 7);
  const mcpJson = serializeSession(mcpEnded);
  const restored = deserializeSession(mcpJson);
  assert.equal(restored.events.length, 7);
  assert.equal(
    restored.events.filter((e) => e.type.startsWith("mcp-")).length,
    5
  );
});

// ── Test 6: RAG / retrieval events ───────────────────────────────────────────

console.log(`\n${HEAD}6. RAG / retrieval events${RESET}`);

const ragTransport = new InMemoryTransport();
const ragFr = new FlightRecorder({ transport: ragTransport });

test("record() accepts retrieval-query", () => {
  ragFr.startSession({ label: "rag-smoke" });
  ragFr.record({
    type: "retrieval-query",
    query: "What is the capital of France?",
    store: "pinecone",
    topK: 5,
  });
  assert.equal(ragFr.session?.events.length, 2); // session-started + retrieval-query
});

test("record() accepts retrieval-result", () => {
  ragFr.record({
    type: "retrieval-result",
    store: "pinecone",
    chunks: [
      {
        documentId: "doc_001",
        score: 0.97,
        content: "Paris is the capital and most populous city of France.",
        metadata: { source: "wikipedia" },
      },
      {
        documentId: "doc_002",
        score: 0.88,
        content: "France's capital city Paris has been the country's center since medieval times.",
      },
    ],
    durationMs: 42,
  });
  assert.equal(ragFr.session?.events.length, 3); // + retrieval-result
});

test("RAG session round-trips through serialization", () => {
  const ragEnded = ragFr.endSession();
  // session-started + 2 RAG events + session-ended
  assert.equal(ragEnded.events.length, 4);
  const ragJson = serializeSession(ragEnded);
  const restored = deserializeSession(ragJson);
  assert.equal(restored.events.length, 4);
  assert.equal(
    restored.events.filter((e) => e.type.startsWith("retrieval-")).length,
    2
  );
});

// ── Test 7: Agent action events ───────────────────────────────────────────────

console.log(`\n${HEAD}7. Agent action events${RESET}`);

const agentTransport = new InMemoryTransport();
const agentFr = new FlightRecorder({ transport: agentTransport });

test("record() accepts agent-run-started", () => {
  agentFr.startSession({ label: "agent-smoke" });
  agentFr.record({
    type: "agent-run-started",
    agentName: "research-agent",
    goal: "Find recent papers on RAG performance",
    input: { topic: "RAG", limit: 10 },
  });
  assert.equal(agentFr.session?.events.length, 2); // session-started + agent-run-started
});

test("record() accepts agent-step", () => {
  agentFr.record({
    type: "agent-step",
    agentName: "research-agent",
    stepIndex: 0,
    thought: "I should search arxiv for recent RAG papers",
    action: "search_arxiv",
    actionInput: { query: "RAG retrieval augmented generation 2024" },
  });
  assert.equal(agentFr.session?.events.length, 3);
});

test("record() accepts agent-handoff", () => {
  agentFr.record({
    type: "agent-handoff",
    fromAgent: "research-agent",
    toAgent: "summarizer-agent",
    reason: "Research complete, summarization needed",
    input: { papers: ["paper_001", "paper_002"] },
  });
  assert.equal(agentFr.session?.events.length, 4);
});

test("record() accepts agent-run-ended", () => {
  agentFr.record({
    type: "agent-run-ended",
    agentName: "research-agent",
    outcome: "handoff",
    durationMs: 3200,
    iterations: 3,
  });
  assert.equal(agentFr.session?.events.length, 5);
});

test("agent session round-trips through serialization", () => {
  const agentEnded = agentFr.endSession();
  // session-started + 4 agent events + session-ended
  assert.equal(agentEnded.events.length, 6);
  const agentJson = serializeSession(agentEnded);
  const restored = deserializeSession(agentJson);
  assert.equal(restored.events.length, 6);
  assert.equal(
    restored.events.filter((e) => e.type.startsWith("agent-")).length,
    4
  );
});

// ── Test 9: HttpTransport ─────────────────────────────────────────────────────

console.log(`\n${HEAD}9. HttpTransport${RESET}`);

test("HttpTransport constructs with url", () => {
  const t = new HttpTransport({ url: "https://api.example.com/sessions" });
  assert.ok(t);
});

test("HttpTransport constructs with url and apiKey", () => {
  const t = new HttpTransport({ url: "https://api.example.com/sessions", apiKey: "sk-test" });
  assert.ok(t);
});

// ── Test 10: OpenTelemetry export ─────────────────────────────────────────────

console.log(`\n${HEAD}10. OpenTelemetry export${RESET}`);

test("toOtlp() returns a valid OTLP payload structure", () => {
  const payload = toOtlp(ended);
  assert.ok(Array.isArray(payload.resourceSpans));
  assert.equal(payload.resourceSpans.length, 1);
  assert.ok(Array.isArray(payload.resourceSpans[0].scopeSpans));
  assert.ok(Array.isArray(payload.resourceSpans[0].scopeSpans[0].spans));
});

test("toOtlp() root span traceId is session.id without dashes", () => {
  const payload = toOtlp(ended);
  const rootSpan = payload.resourceSpans[0].scopeSpans[0].spans[0];
  assert.equal(rootSpan.traceId, ended.id.replace(/-/g, ""));
});

test("toOtlp() span count equals 1 root + all events", () => {
  const payload = toOtlp(ended);
  const spans = payload.resourceSpans[0].scopeSpans[0].spans;
  // 1 root span + one span per event
  assert.equal(spans.length, 1 + ended.events.length);
});

test("toOtlp() error event produces a span with error status", () => {
  const fr2 = new FlightRecorder();
  fr2.startSession();
  fr2.record({ type: "error", message: "model overloaded", code: "503" });
  const errorSession = fr2.endSession();
  const payload = toOtlp(errorSession);
  const spans = payload.resourceSpans[0].scopeSpans[0].spans;
  const errorSpan = spans.find((sp) => sp.name === "ai.error");
  assert.ok(errorSpan, "ai.error span should exist");
  assert.equal(errorSpan!.status.code, 2);
  assert.equal(errorSpan!.status.message, "model overloaded");
});

// ── Test 11: Replay engine ────────────────────────────────────────────────────

async function runAsyncTests() {
  await testAsync("HttpTransport.save() rejects on network failure", async () => {
    const t = new HttpTransport({ url: "http://127.0.0.1:1/sessions" });
    const fr2 = new FlightRecorder();
    fr2.startSession({ label: "http-error-test" });
    fr2.record({ type: "prompt", model: "gpt-4o", prompt: "test" });
    const ended = fr2.endSession();
    await assert.rejects(
      () => t.save(ended) as Promise<void>,
      /ECONNREFUSED|fetch failed|Failed to fetch/
    );
  });

  console.log(`\n${HEAD}11. Replay engine${RESET}`);

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

runAsyncTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
