---
title: .flight Format
description: The portable session file format used by AI Flight Recorder.
---

A `.flight` file is a JSON document with a version envelope wrapping a serialized `Session`. It's designed to be human-readable, portable, and stable across versions.

## Structure

```json
{
  "version": "1",
  "exportedAt": 1721484000000,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "label": "bug-report-123",
    "status": "ended",
    "startedAt": 1721484000000,
    "endedAt": 1721484060000,
    "events": [ ... ]
  }
}
```

- `version` — format version string, currently `"1"`
- `exportedAt` — Unix timestamp (ms) when the file was created
- `session` — the full `Session` object including all recorded events

## Exporting

**From the DevTools UI:** click the Export button in the toolbar while a session is active.

**Programmatically:**

```ts
import { serializeSession } from "@ai-flight-recorder/sdk";
import { writeFileSync } from "node:fs";

writeFileSync("bug-123.flight", serializeSession(endedSession));
```

`serializeSession` returns a JSON string. The session must be in `ended` status.

## Importing

**Into the DevTools UI:** click Import and select a `.flight` file. The session is added to the session list and becomes active immediately.

**Programmatically:**

```ts
import { deserializeSession } from "@ai-flight-recorder/sdk";
import { readFileSync } from "node:fs";

const session = deserializeSession(readFileSync("bug-123.flight", "utf-8"));
```

`deserializeSession` validates the envelope and throws if the file is malformed or from an unsupported format version.

## Event types

Every event in the `events` array shares a common base shape:

```ts
{
  id: string;          // UUID
  sessionId: string;
  type: EventType;     // see below
  timestamp: number;   // Unix ms
  spanId?: string;
  parentSpanId?: string;
  metadata?: Record<string, unknown>;
}
```

### Supported event types

| Type | Description |
|---|---|
| `session-started` | Session opened |
| `session-ended` | Session closed |
| `prompt` | User or system prompt sent to a model |
| `token` | Individual streamed token |
| `tool-call` | Model requested a tool call |
| `tool-result` | Tool call result returned |
| `completion` | Final model completion |
| `error` | Error during a request |
| `mcp-server-connected` | MCP server connected |
| `mcp-server-disconnected` | MCP server disconnected |
| `mcp-tools-listed` | MCP server returned tool list |
| `mcp-tool-call` | MCP tool invoked |
| `mcp-tool-result` | MCP tool result received |
| `retrieval-query` | RAG retrieval query sent |
| `retrieval-result` | RAG retrieval result received |
