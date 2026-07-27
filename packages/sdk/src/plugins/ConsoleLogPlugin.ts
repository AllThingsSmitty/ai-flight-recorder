import type { AIEvent, Plugin, Session } from "@ai-flight-recorder/core";

export interface ConsoleLogPluginOptions {
  /** Log individual events as they are recorded. Default: true */
  logEvents?: boolean;
  /** Log a summary table when a session ends. Default: true */
  logSummary?: boolean;
  /** Filter to specific event types. Logs all types if omitted. */
  filter?: Array<AIEvent["type"]>;
  /** Prefix prepended to every log line. Default: "[flight-recorder]" */
  prefix?: string;
}

/**
 * Built-in plugin that logs recorded events and session summaries to the console.
 * Useful for debugging AI interactions during development.
 *
 * Usage:
 *   import { FlightRecorder } from "@ai-flight-recorder/sdk";
 *   import { ConsoleLogPlugin } from "@ai-flight-recorder/sdk";
 *
 *   const fr = new FlightRecorder({
 *     plugins: [new ConsoleLogPlugin()],
 *   });
 */
export class ConsoleLogPlugin implements Plugin {
  readonly name = "console-log";

  private _logEvents: boolean;
  private _logSummary: boolean;
  private _filter?: Set<AIEvent["type"]>;
  private _prefix: string;

  constructor(options: ConsoleLogPluginOptions = {}) {
    this._logEvents  = options.logEvents  ?? true;
    this._logSummary = options.logSummary ?? true;
    this._filter     = options.filter ? new Set(options.filter) : undefined;
    this._prefix     = options.prefix ?? "[flight-recorder]";
  }

  onSessionStart(session: Session): void {
    console.log(`${this._prefix} session started: ${session.label ?? session.id}`);
  }

  onEvent(event: AIEvent): void {
    if (!this._logEvents) return;
    if (this._filter && !this._filter.has(event.type)) return;
    if (event.type === "session-started" || event.type === "session-ended") return;

    const summary = _eventSummary(event);
    console.log(`${this._prefix} [${event.type}] ${summary}`);
  }

  onSessionEnd(session: Session): void {
    if (!this._logSummary) return;

    const endEvent = session.events.find((e) => e.type === "session-ended");
    if (!endEvent || endEvent.type !== "session-ended") return;

    const durationSec = (endEvent.durationMs / 1000).toFixed(2);
    const tokens = endEvent.totalTokens ?? 0;
    const cost = endEvent.estimatedCost != null
      ? `$${endEvent.estimatedCost.toFixed(6)}`
      : "unknown";

    console.log(
      `${this._prefix} session ended: ${session.label ?? session.id} ` +
      `| ${endEvent.totalEvents} events | ${durationSec}s | ${tokens} tokens | cost: ${cost}`
    );
  }
}

function _eventSummary(event: AIEvent): string {
  switch (event.type) {
    case "prompt":
      return `model=${event.model} prompt="${_truncate(event.prompt, 60)}"`;
    case "token":
      return `[${event.index}] "${_truncate(event.token, 40)}"`;
    case "tool-call":
      return `${event.toolName}(${JSON.stringify(event.input ?? {}).slice(0, 60)})`;
    case "tool-result":
      return `${event.toolCallId} success=${event.success ?? true}`;
    case "completion":
      return `finish=${event.finishReason} tokens=${event.totalTokens ?? "?"} "${_truncate(event.response, 60)}"`;
    case "error":
      return event.message;
    default:
      return event.type;
  }
}

function _truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "…";
}
