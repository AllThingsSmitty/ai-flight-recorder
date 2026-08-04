---
title: OpenTelemetry Export
description: Export AI Flight Recorder sessions as OTLP trace payloads for ingestion into any OpenTelemetry-compatible backend.
---

`toOtlp` converts a recorded `Session` into a valid [OTLP/JSON](https://opentelemetry.io/docs/specs/otlp/) trace payload. Each session becomes a trace, and each event becomes a span, making AI interactions visible in tools like Jaeger, Tempo, Honeycomb, or any OTLP-compatible backend.

## Usage

```ts
import { FlightRecorder, toOtlp } from "@ai-flight-recorder/sdk";

const recorder = new FlightRecorder();
recorder.start();

// ... run your AI interactions ...

const session = recorder.end();
const payload = toOtlp(session);
```

## Sending to a collector

`toOtlp` returns a plain object — send it to any OTLP HTTP endpoint:

```ts
await fetch("http://localhost:4318/v1/traces", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

## Payload structure

The returned payload follows the OTLP `ExportTraceServiceRequest` shape:

```json
{
  "resourceSpans": [{
    "resource": {
      "attributes": [{ "key": "service.name", "value": { "stringValue": "ai-flight-recorder" } }]
    },
    "scopeSpans": [{
      "scope": { "name": "@ai-flight-recorder/sdk", "version": "0.1.2" },
      "spans": [ ... ]
    }]
  }]
}
```

The first span is a **root span** representing the session. All event spans are children of it.

## Span mapping

Each event type maps to a named span with typed attributes:

| Event type | Span name | Key attributes |
|---|---|---|
| `prompt` | `ai.prompt` | `ai.model`, `ai.prompt`, `ai.temperature` |
| `completion` | `ai.completion` | `ai.response`, `ai.finish_reason`, `ai.prompt_tokens`, `ai.completion_tokens`, `ai.estimated_cost_usd` |
| `token` | `ai.token` | `ai.token`, `ai.token.index` |
| `tool-call` | `tool.call.<name>` | `tool.name`, `tool.call_id`, `tool.input` |
| `tool-result` | `tool.result` | `tool.call_id`, `tool.success`, `tool.duration_ms` |
| `error` | `ai.error` | `error.message`, `error.code` |
| `mcp-tool-call` | `mcp.tool.call.<name>` | `mcp.server_name`, `mcp.tool_name`, `mcp.input` |
| `retrieval-query` | `rag.query` | `rag.query`, `rag.store`, `rag.top_k` |
| `retrieval-result` | `rag.result` | `rag.chunk_count`, `rag.store`, `rag.duration_ms` |
| `agent-run-started` | `agent.run.<name>` | `agent.name`, `agent.goal` |
| `agent-run-ended` | `agent.run.ended` | `agent.name`, `agent.outcome`, `agent.iterations` |
| `agent-handoff` | `agent.handoff` | `agent.from`, `agent.to`, `agent.reason` |

String attribute values are clipped to 256 characters.

## Notes

- The session `id` (UUID) is used as the OTLP `traceId` (with hyphens stripped).
- `session-started` and `session-ended` events are included as spans on the root trace.
- The root span's `endTimeUnixNano` uses `session.endedAt` — call `recorder.end()` before exporting.
