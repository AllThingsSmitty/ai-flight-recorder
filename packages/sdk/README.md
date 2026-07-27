# @ai-flight-recorder/sdk

[![npm](https://img.shields.io/npm/v/@ai-flight-recorder/sdk.svg)](https://www.npmjs.com/package/@ai-flight-recorder/sdk)

Developer SDK for [AI Flight Recorder](https://github.com/AllThingsSmitty/ai-flight-recorder) — record, replay, and inspect every interaction in an AI application.

Drop in a one-line wrapper around your existing OpenAI, Anthropic, or Gemini client and get a full structured event stream you can replay, export, and hand off as a `.flight` file.

## Install

```bash
npm install @ai-flight-recorder/sdk
```

## Quick start

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
fr.startSession({ label: "my-chat" });

fr.record({ type: "prompt", model: "gpt-4o", prompt: "Hello" });
fr.record({ type: "completion", response: "Hi!", finishReason: "stop", totalTokens: 10 });

const session = fr.endSession();
```

## Provider adapters

One-line wrappers that intercept your provider client and record every call automatically.

**OpenAI**

```ts
import OpenAI from "openai";
import { FlightRecorder, wrapOpenAI } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const openai = wrapOpenAI(new OpenAI(), fr.recorder);

fr.startSession({ label: "chat" });
await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: "Hello" }] });
fr.endSession();
```

**Anthropic**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { FlightRecorder, wrapAnthropic } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const client = wrapAnthropic(new Anthropic(), fr.recorder);

fr.startSession({ label: "claude-chat" });
await client.messages.create({ model: "claude-sonnet-4-5", max_tokens: 1024, messages: [{ role: "user", content: "Hello" }] });
fr.endSession();
```

**Google Gemini**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FlightRecorder, wrapGeminiModel } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const model = wrapGeminiModel(
  new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!).getGenerativeModel({ model: "gemini-1.5-pro" }),
  fr.recorder,
);

fr.startSession({ label: "gemini-chat" });
await model.generateContent("Hello");
fr.endSession();
```

All three adapters support streaming.

## Plugins

```ts
import { FlightRecorder, ConsoleLogPlugin } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder({
  plugins: [
    new ConsoleLogPlugin({ logEvents: true, logSummary: true }),
    {
      name: "my-plugin",
      onSessionStart: (session) => console.log("Started:", session.id),
      onEvent: (event) => myMetrics.record(event),
      onSessionEnd: (session) => alerting.flush(session),
    },
  ],
});
```

## Transports

```ts
import { FlightRecorder, InMemoryTransport } from "@ai-flight-recorder/sdk";

const transport = new InMemoryTransport();
const fr = new FlightRecorder({ transport });

fr.startSession();
fr.endSession(); // saves to transport

const sessions = transport.getAll();
```

**Filesystem (Node.js):**

```ts
import { FlightRecorder } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const fr = new FlightRecorder({ transport: new FileTransport("./recordings") });
fr.startSession({ label: "my-session" });
fr.endSession();
// saves to ./recordings/<sessionId>.flight
```

## `.flight` export / import

```ts
import { serializeSession, deserializeSession } from "@ai-flight-recorder/sdk";
import { writeFileSync, readFileSync } from "node:fs";

writeFileSync("session.flight", serializeSession(endedSession));
const session = deserializeSession(readFileSync("session.flight", "utf-8"));
```

## Full documentation

See the [AI Flight Recorder repository](https://github.com/AllThingsSmitty/ai-flight-recorder) for the DevTools app, the Next.js example, and the full development guide.

## License

MIT
