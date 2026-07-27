import {
  AIEvent,
  Session,
  sessionDurationMs,
  sessionEstimatedCost,
  sessionTotalTokens,
} from "@ai-flight-recorder/core";

export interface OtlpAttribute {
  key: string;
  value:
    | { stringValue: string }
    | { intValue: number }
    | { doubleValue: number }
    | { boolValue: boolean };
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  status: { code: number; message?: string };
}

export interface OtlpPayload {
  resourceSpans: Array<{
    resource: { attributes: OtlpAttribute[] };
    scopeSpans: Array<{
      scope: { name: string; version: string };
      spans: OtlpSpan[];
    }>;
  }>;
}

export function toOtlp(session: Session): OtlpPayload {
  const traceId = session.id.replace(/-/g, "");
  const rootSpanId = traceId.slice(0, 16);
  const totalTokens = sessionTotalTokens(session);
  const estimatedCost = sessionEstimatedCost(session);

  const rootSpan: OtlpSpan = {
    traceId,
    spanId: rootSpanId,
    name: session.label ?? "ai.session",
    kind: 1,
    startTimeUnixNano: msToNano(session.startedAt),
    endTimeUnixNano: msToNano(session.endedAt ?? session.startedAt),
    attributes: [
      s("session.id", session.id),
      ...(session.label ? [s("session.label", session.label)] : []),
      i("session.event_count", session.events.length),
      i("session.duration_ms", sessionDurationMs(session)),
      ...(totalTokens > 0 ? [i("session.total_tokens", totalTokens)] : []),
      ...(estimatedCost > 0 ? [d("session.estimated_cost_usd", estimatedCost)] : []),
    ],
    status: { code: 1 },
  };

  const eventSpans = session.events.map((e) =>
    eventToSpan(e, traceId, rootSpanId)
  );

  return {
    resourceSpans: [
      {
        resource: { attributes: [s("service.name", "ai-flight-recorder")] },
        scopeSpans: [
          {
            scope: { name: "@ai-flight-recorder/sdk", version: "0.0.1" },
            spans: [rootSpan, ...eventSpans],
          },
        ],
      },
    ],
  };
}

function eventToSpan(
  event: AIEvent,
  traceId: string,
  defaultParentId: string
): OtlpSpan {
  const spanId = event.id.replace(/-/g, "").slice(0, 16);
  const parentSpanId = event.parentSpanId
    ? event.parentSpanId.replace(/-/g, "").slice(0, 16)
    : defaultParentId;

  const span = (
    name: string,
    attributes: OtlpAttribute[],
    opts: { durationMs?: number; errorMessage?: string } = {}
  ): OtlpSpan => ({
    traceId,
    spanId,
    parentSpanId,
    name,
    kind: 1,
    startTimeUnixNano: msToNano(event.timestamp),
    endTimeUnixNano: msToNano(event.timestamp + (opts.durationMs ?? 1)),
    attributes,
    status:
      opts.errorMessage !== undefined
        ? { code: 2, message: opts.errorMessage }
        : { code: 1 },
  });

  switch (event.type) {
    case "session-started":
      return span("session.started", [
        ...(event.label ? [s("session.label", event.label)] : []),
      ]);

    case "session-ended":
      return span(
        "session.ended",
        [
          i("session.total_events", event.totalEvents),
          i("session.duration_ms", event.durationMs),
          ...(event.totalTokens != null ? [i("session.total_tokens", event.totalTokens)] : []),
          ...(event.estimatedCost != null ? [d("session.estimated_cost_usd", event.estimatedCost)] : []),
        ],
        { durationMs: event.durationMs }
      );

    case "prompt":
      return span("ai.prompt", [
        s("ai.model", event.model),
        s("ai.prompt", clip(event.prompt, 256)),
        ...(event.temperature != null ? [d("ai.temperature", event.temperature)] : []),
        ...(event.maxTokens != null ? [i("ai.max_tokens", event.maxTokens)] : []),
      ]);

    case "token":
      return span("ai.token", [
        s("ai.token", event.token),
        i("ai.token.index", event.index),
        ...(event.isFinal != null ? [b("ai.token.is_final", event.isFinal)] : []),
      ]);

    case "completion":
      return span("ai.completion", [
        s("ai.response", clip(event.response, 256)),
        s("ai.finish_reason", event.finishReason),
        ...(event.promptTokens != null ? [i("ai.prompt_tokens", event.promptTokens)] : []),
        ...(event.completionTokens != null ? [i("ai.completion_tokens", event.completionTokens)] : []),
        ...(event.totalTokens != null ? [i("ai.total_tokens", event.totalTokens)] : []),
        ...(event.estimatedCost != null ? [d("ai.estimated_cost_usd", event.estimatedCost)] : []),
      ]);

    case "tool-call":
      return span(`tool.call.${event.toolName}`, [
        s("tool.name", event.toolName),
        s("tool.call_id", event.toolCallId),
        s("tool.input", JSON.stringify(event.input)),
      ]);

    case "tool-result":
      return span(
        "tool.result",
        [
          s("tool.call_id", event.toolCallId),
          b("tool.success", event.success),
          ...(event.durationMs != null ? [i("tool.duration_ms", event.durationMs)] : []),
        ],
        { durationMs: event.durationMs }
      );

    case "error":
      return span(
        "ai.error",
        [
          s("error.message", event.message),
          ...(event.code ? [s("error.code", event.code)] : []),
        ],
        { errorMessage: event.message }
      );

    case "mcp-server-connected":
      return span("mcp.server.connect", [
        s("mcp.server_name", event.serverName),
        s("mcp.transport", event.transport),
        ...(event.serverVersion ? [s("mcp.server_version", event.serverVersion)] : []),
      ]);

    case "mcp-server-disconnected":
      return span("mcp.server.disconnect", [
        s("mcp.server_name", event.serverName),
        ...(event.reason ? [s("mcp.reason", event.reason)] : []),
      ]);

    case "mcp-tools-listed":
      return span("mcp.tools.listed", [
        s("mcp.server_name", event.serverName),
        i("mcp.tool_count", event.tools.length),
      ]);

    case "mcp-tool-call":
      return span(`mcp.tool.call.${event.toolName}`, [
        s("mcp.server_name", event.serverName),
        s("mcp.tool_name", event.toolName),
        s("mcp.tool_call_id", event.toolCallId),
        s("mcp.input", JSON.stringify(event.input)),
      ]);

    case "mcp-tool-result":
      return span(
        "mcp.tool.result",
        [
          s("mcp.server_name", event.serverName),
          s("mcp.tool_call_id", event.toolCallId),
          b("mcp.success", event.success),
          ...(event.durationMs != null ? [i("mcp.duration_ms", event.durationMs)] : []),
        ],
        { durationMs: event.durationMs }
      );

    case "retrieval-query":
      return span("rag.query", [
        s("rag.query", clip(event.query, 256)),
        ...(event.store ? [s("rag.store", event.store)] : []),
        ...(event.topK != null ? [i("rag.top_k", event.topK)] : []),
      ]);

    case "retrieval-result":
      return span(
        "rag.result",
        [
          i("rag.chunk_count", event.chunks.length),
          ...(event.store ? [s("rag.store", event.store)] : []),
          ...(event.durationMs != null ? [i("rag.duration_ms", event.durationMs)] : []),
        ],
        { durationMs: event.durationMs }
      );

    case "agent-run-started":
      return span(`agent.run.${event.agentName}`, [
        s("agent.name", event.agentName),
        ...(event.goal ? [s("agent.goal", clip(event.goal, 256))] : []),
      ]);

    case "agent-run-ended":
      return span(
        "agent.run.ended",
        [
          s("agent.name", event.agentName),
          s("agent.outcome", event.outcome),
          ...(event.iterations != null ? [i("agent.iterations", event.iterations)] : []),
          ...(event.durationMs != null ? [i("agent.duration_ms", event.durationMs)] : []),
        ],
        { durationMs: event.durationMs }
      );

    case "agent-step":
      return span("agent.step", [
        s("agent.name", event.agentName),
        i("agent.step_index", event.stepIndex),
        ...(event.action ? [s("agent.action", event.action)] : []),
        ...(event.thought ? [s("agent.thought", clip(event.thought, 256))] : []),
      ]);

    case "agent-handoff":
      return span("agent.handoff", [
        s("agent.from", event.fromAgent),
        s("agent.to", event.toAgent),
        ...(event.reason ? [s("agent.reason", event.reason)] : []),
      ]);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function s(key: string, value: string): OtlpAttribute {
  return { key, value: { stringValue: value } };
}

function i(key: string, value: number): OtlpAttribute {
  return { key, value: { intValue: value } };
}

function d(key: string, value: number): OtlpAttribute {
  return { key, value: { doubleValue: value } };
}

function b(key: string, value: boolean): OtlpAttribute {
  return { key, value: { boolValue: value } };
}

function msToNano(ms: number): string {
  return String(ms * 1_000_000);
}

function clip(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
