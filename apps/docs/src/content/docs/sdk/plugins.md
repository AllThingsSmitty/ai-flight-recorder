---
title: Plugins
description: Hook into the recorder lifecycle with custom observers.
---

Plugins let you observe session and event lifecycle hooks without modifying the core recording logic. Common uses: logging, metrics, alerting, and custom sinks.

## Built-in plugin: ConsoleLogPlugin

```ts
import { FlightRecorder, ConsoleLogPlugin } from "@ai-flight-recorder/sdk";

const fr = new FlightRecorder({
  plugins: [
    new ConsoleLogPlugin({ logEvents: true, logSummary: true }),
  ],
});
```

`logEvents` prints each event as it's recorded. `logSummary` prints a session summary on `endSession`.

## Writing a plugin

Implement the `Plugin` interface:

```ts
import type { Plugin, AIEvent, Session } from "@ai-flight-recorder/sdk";

export class MyPlugin implements Plugin {
  readonly name = "my-plugin";

  onSessionStart(session: Session) {
    console.log("Session started:", session.id);
  }

  onEvent(event: AIEvent) {
    myMetrics.record(event);
  }

  onSessionEnd(session: Session) {
    alerting.flush(session);
  }
}
```

All three methods are optional — implement only the hooks you need.

## Inline plugins

You can pass a plain object instead of a class instance:

```ts
const fr = new FlightRecorder({
  plugins: [
    {
      name: "inline-logger",
      onEvent: (event) => console.log(event.type),
    },
  ],
});
```

## Registering after construction

Use `.use()` to attach a plugin after the `FlightRecorder` is created. It's chainable:

```ts
fr.use(pluginA).use(pluginB);
```

Registering a plugin with a duplicate name logs a warning and skips registration.
