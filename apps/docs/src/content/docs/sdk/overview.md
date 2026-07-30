---
title: FlightRecorder
description: The main entry point for recording AI sessions.
---

`FlightRecorder` is the main API surface of `@ai-flight-recorder/sdk`. It wraps the lower-level `Recorder` from core and adds plugins, transports, and provider adapter support.

## Creating an instance

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
```

Pass options at construction time:

```ts
import { FlightRecorder, ConsoleLogPlugin, InMemoryTransport } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder({
  plugins: [new ConsoleLogPlugin()],
  transport: new InMemoryTransport(),
});
```

## Session lifecycle

```ts
// Start a session — throws if one is already active
fr.startSession({ label: "chat" });

// Record events manually
fr.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
fr.record({ type: "completion", response: "Hi!", finishReason: "stop", totalTokens: 12 });

// End the session — calls transport.save() automatically
const session = fr.endSession();
```

`label` is optional but appears in the DevTools session list and `.flight` exports.

## Using adapters

Rather than calling `fr.record()` manually, use a provider adapter to intercept every call automatically:

```ts
import OpenAI from "openai";
import { FlightRecorder, wrapOpenAI } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const openai = wrapOpenAI(new OpenAI(), fr.recorder);

fr.startSession({ label: "chat" });
await openai.chat.completions.create({ model: "gpt-4o", messages: [...] });
fr.endSession();
```

See [Adapters](/sdk/adapters/) for OpenAI, Anthropic, and Gemini wrappers.

## Plugins

Attach plugins with `.use()` — it's chainable and checks for duplicate names at registration:

```ts
fr.use(pluginA).use(pluginB);
```

See [Plugins](/sdk/plugins/) for details.

## Transports

`transport.save()` is called automatically when `endSession()` runs. Pass a transport at construction or use the default in-memory store.

See [Transports](/sdk/transports/) for details.

## Accessing the underlying recorder

If you need direct access to the core `Recorder` (e.g. to pass to an adapter):

```ts
const recorder = fr.recorder;
```
