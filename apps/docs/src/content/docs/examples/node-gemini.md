---
title: Node.js + Gemini
description: Recording a Google Gemini generateContent call with FileTransport.
---

`examples/node-gemini` shows how to record a Gemini `generateContent` call and save the session to disk.

## Setup

```bash
cd examples/node-gemini
cp .env.example .env.local
```

Add your Google API key to `.env.local`:

```
GOOGLE_API_KEY=...
```

## Run

```bash
pnpm start
```

The example makes a single `generateContent` call and writes the session to `./recordings/` as a `.flight` file.

## Code walkthrough

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FlightRecorder,
  wrapGeminiModel,
  type GeminiModelLike,
} from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const fr = new FlightRecorder({
  transport: new FileTransport("./recordings"),
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = wrapGeminiModel(
  genAI.getGenerativeModel({ model: "gemini-1.5-pro" }) as unknown as GeminiModelLike,
  fr.recorder,
);

fr.startSession({ label: "gemini-example" });

const result = await model.generateContent("What is the capital of France?");
console.log(result.response.text());

fr.endSession();
// session saved to ./recordings/<sessionId>.flight
```

The `as unknown as GeminiModelLike` cast is required because the Gemini SDK's `GenerativeModel` type doesn't structurally match the adapter interface. See [Adapters](/sdk/adapters/) for an explanation.
