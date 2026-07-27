# @ai-flight-recorder/core

[![npm](https://img.shields.io/npm/v/@ai-flight-recorder/core.svg)](https://www.npmjs.com/package/@ai-flight-recorder/core)

Core domain model for [AI Flight Recorder](https://github.com/AllThingsSmitty/ai-flight-recorder) — events, sessions, the recorder engine, and the replay engine.

> **Most users should install [`@ai-flight-recorder/sdk`](https://www.npmjs.com/package/@ai-flight-recorder/sdk) instead.** This package contains the internal domain model and is intended for authors building custom adapters, transports, or tooling on top of the recorder.

## Install

```bash
npm install @ai-flight-recorder/core
```

## What's in this package

| Module | Description |
|---|---|
| `events/` | All `AIEvent` types — `PromptEvent`, `CompletionEvent`, `ToolCallEvent`, `TokenEvent`, and more |
| `session/` | `Session` type and serialization (`serializeSession` / `deserializeSession`) |
| `recorder/` | `Recorder` — the low-level event sink that sessions write to |
| `replay/` | `ReplayEngine` and `ReplayState` for replaying a recorded session |
| `plugins/` | `Plugin` and `Transport` interfaces |

## Usage

```ts
import type { AIEvent, Session } from "@ai-flight-recorder/core";
import { Recorder } from "@ai-flight-recorder/core";
```

For provider adapters, plugins, transports, and the high-level `FlightRecorder` API, see [`@ai-flight-recorder/sdk`](https://www.npmjs.com/package/@ai-flight-recorder/sdk).

## License

MIT
