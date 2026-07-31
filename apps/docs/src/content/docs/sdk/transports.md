---
title: Transports
description: Plug in any storage backend for saving recorded sessions.
---

A transport is called automatically when `endSession()` runs. It receives the completed `Session` and is responsible for persisting it.

## InMemoryTransport

Stores sessions in memory. Useful for testing and short-lived server-side use cases.

```ts
import { FlightRecorder, InMemoryTransport } from "@ai-flight-recorder/sdk";

const transport = new InMemoryTransport();
const fr = new FlightRecorder({ transport });

fr.startSession();
// ... record events ...
fr.endSession();

const sessions = transport.getAll();
```

## FileTransport

Writes each session as a `.flight` file to a directory on disk. Node.js only — import from the `/node` entry point.

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const transport = new FileTransport("./recordings");
const fr = new FlightRecorder({ transport });

fr.startSession({ label: "my-session" });
// ... record events ...
fr.endSession();
// saves ./recordings/<sessionId>.flight

const sessions = transport.loadAll();
```

`loadAll()` deserializes and returns all `.flight` files in the directory.

## HttpTransport

Posts each session as JSON to an HTTP endpoint.

```ts
import { FlightRecorder, HttpTransport } from "@ai-flight-recorder/sdk";

const transport = new HttpTransport({ url: "https://your-api.example.com/sessions" });
const fr = new FlightRecorder({ transport });
```

Optionally pass an `apiKey` and `timeout`:

```ts
const transport = new HttpTransport({
  url: "https://your-api.example.com/sessions",
  apiKey: process.env.MY_API_KEY,
  timeout: 10_000,
});
```

## Custom transport

Implement the `Transport` interface to plug in any backend:

```ts
import type { Transport } from "@ai-flight-recorder/sdk";

class MyApiTransport implements Transport {
  async save(session) {
    await fetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });
  }
}

const fr = new FlightRecorder({ transport: new MyApiTransport() });
```

The `save` method receives the fully ended `Session` object and can be async.
