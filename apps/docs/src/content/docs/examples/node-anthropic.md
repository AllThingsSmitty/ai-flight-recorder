---
title: Node.js + Anthropic
description: Recording an Anthropic messages.create call with FileTransport.
---

`examples/node-anthropic` shows how to record a non-streaming Anthropic call and save the session to disk.

## Setup

```bash
cd examples/node-anthropic
cp .env.example .env.local
```

Add your Anthropic API key to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
pnpm start
```

The example makes a single `messages.create` call and writes the session to `./recordings/` as a `.flight` file.

## Code walkthrough

```ts
import Anthropic from "@anthropic-ai/sdk";
import {
  FlightRecorder,
  wrapAnthropic,
  type AnthropicClientLike,
} from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const fr = new FlightRecorder({
  transport: new FileTransport("./recordings"),
});

const client = wrapAnthropic(
  new Anthropic() as unknown as AnthropicClientLike,
  fr.recorder,
);

fr.startSession({ label: "anthropic-example" });

const message = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What is the capital of France?" }],
});

console.log(message.content[0]);

fr.endSession();
// session saved to ./recordings/<sessionId>.flight
```

The `as unknown as AnthropicClientLike` cast is required because Anthropic's SDK uses strict method overloads. See [Adapters](/sdk/adapters/) for an explanation.
