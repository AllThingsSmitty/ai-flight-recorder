---
title: DevTools App
description: A visual interface for recorded AI sessions.
---

The DevTools app (`apps/devtools`) is a Next.js application that gives you a browser-based UI for exploring, replaying, and inspecting recorded sessions.

## Running locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app loads with two demo sessions so you can explore immediately — no API keys required.

## Views

### Timeline

A chronological event list showing every recorded event with:

- Type badge (Prompt, Token, Tool, Result, Completion, Error)
- Human-readable description
- Timing offset from session start

### Waterfall

A visual latency breakdown showing streaming spans and tool call durations side by side. Useful for spotting where time is spent in a multi-step request.

### Cost Analysis

Token usage breakdown and estimated spend per request, using the built-in pricing table for OpenAI, Anthropic, and Gemini models.

## Replay

Click **Replay Session** to enter replay mode. The session plays back in real time, assembling the token stream as it goes.

**Controls:**
- Speed: 0.25×, 0.5×, 1×, 2×, 4×, 8×
- Seek bar: jump to any point in the session
- Pause/resume at any time

## Search and filter

- Filter events by type using the chip row at the top of the timeline
- Text search across all event content

## Import and export

**Export:** click the Export button in the toolbar to download the active session as a `.flight` file.

**Import:** click Import and select a `.flight` file. The session is added to the session list immediately.

See [.flight Format](/reference/flight-format/) for file format details.
