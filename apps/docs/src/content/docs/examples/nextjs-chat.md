---
title: Next.js Chat
description: Full-stack streaming chat with OpenAI and .flight export.
---

`examples/nextjs-chat` is a minimal Next.js 15 app showing a full end-to-end integration: streaming GPT-4o-mini chat, automatic session recording, and `.flight` export.

## Setup

```bash
cd examples/nextjs-chat
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

## Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Chat with the assistant, then click **Export .flight** in the header to download the session.

## Replay in DevTools

1. Open the DevTools app (`pnpm dev` from the repo root)
2. Click **Import** in the toolbar
3. Select the `.flight` file

Your session loads instantly with the full timeline, waterfall, cost breakdown, and streaming replay.

## How it works

The example wires up three things from the SDK in `src/app/api/chat/route.ts`:

- `FlightRecorder` — starts a session per request
- `wrapOpenAI` — intercepts the OpenAI client and records every prompt, token, and completion automatically
- `serializeSession` — serializes the ended session to JSON for download

To switch providers, replace `wrapOpenAI` with `wrapAnthropic` or `wrapGeminiModel`. See [Adapters](/sdk/adapters/) for the cast pattern required by Anthropic and Gemini.
