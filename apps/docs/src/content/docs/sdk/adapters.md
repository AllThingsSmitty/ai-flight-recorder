---
title: Adapters
description: Drop-in wrappers for OpenAI, Anthropic, and Google Gemini.
---

Adapters intercept a provider client and record every call automatically — prompts, streamed tokens, tool calls, and completions. No manual `fr.record()` calls needed.

All adapters support both streaming and non-streaming requests.

## OpenAI

```ts
import OpenAI from "openai";
import { FlightRecorder, wrapOpenAI } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const openai = wrapOpenAI(new OpenAI(), fr.recorder);

fr.startSession({ label: "chat" });

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});

fr.endSession();
```

`wrapOpenAI` returns a proxy that behaves identically to the real OpenAI client. Swap it in without changing any other call sites.

## Anthropic

```ts
import Anthropic from "@anthropic-ai/sdk";
import {
  FlightRecorder,
  wrapAnthropic,
  type AnthropicClientLike,
} from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const client = wrapAnthropic(
  new Anthropic() as unknown as AnthropicClientLike,
  fr.recorder,
);

fr.startSession({ label: "claude-chat" });

const message = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});

fr.endSession();
```

:::note
The `as unknown as AnthropicClientLike` cast is required because the real Anthropic SDK uses strict overloads that TypeScript won't structurally assign to the adapter interface. This is safe — it only affects the type assignment.
:::

## Google Gemini

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FlightRecorder,
  wrapGeminiModel,
  type GeminiModelLike,
} from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = wrapGeminiModel(
  genAI.getGenerativeModel({ model: "gemini-1.5-pro" }) as unknown as GeminiModelLike,
  fr.recorder,
);

fr.startSession({ label: "gemini-chat" });
const result = await model.generateContent("Hello");
fr.endSession();
```

The same `as unknown as GeminiModelLike` cast applies here for the same reason.

## Streaming

All three adapters handle streaming automatically. Tokens are recorded individually as `token` events as they arrive, and a `completion` event is emitted when the stream closes.

```ts
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of stream) {
  // consume as normal — tokens are recorded behind the scenes
}
```

## Exported types

The following types are exported from `@ai-flight-recorder/sdk` for use with the cast pattern:

- `AnthropicClientLike`
- `AnthropicMessageResponse`
- `GeminiModelLike`
