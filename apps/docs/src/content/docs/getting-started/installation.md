---
title: Installation
description: Add AI Flight Recorder to your project.
---

## Prerequisites

- Node.js 18+
- npm, pnpm, or yarn

## Install

Most projects only need the SDK package — it re-exports everything from core.

```bash
npm install @ai-flight-recorder/sdk
```

If you need the core domain model without the SDK layer:

```bash
npm install @ai-flight-recorder/core
```

## Quick start

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
fr.startSession({ label: "my-session" });

fr.record({
  type: "prompt",
  model: "gpt-4o",
  prompt: "What is the capital of France?",
});

fr.record({
  type: "completion",
  response: "Paris.",
  finishReason: "stop",
  totalTokens: 18,
});

const session = fr.endSession();
```

For automatic recording without manual `fr.record()` calls, use a [provider adapter](/sdk/adapters/).

## Node.js filesystem transport

To write sessions to disk as `.flight` files, import `FileTransport` from the `/node` entry point:

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const fr = new FlightRecorder({
  transport: new FileTransport("./recordings"),
});

fr.startSession({ label: "my-session" });
// ... record events ...
fr.endSession();
// writes ./recordings/<sessionId>.flight
```
