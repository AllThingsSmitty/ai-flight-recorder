import type { EventType } from "@flight-recorder/sdk";

export interface EventMeta {
  label: string;
  color: string;       // Tailwind text color class
  bgColor: string;     // Tailwind bg color class
  borderColor: string; // Tailwind border color class
  dotColor: string;    // hex for canvas/SVG use
}

const META: Record<EventType, EventMeta> = {
  "session-started": {
    label: "Session",
    color: "text-zinc-300",
    bgColor: "bg-zinc-800",
    borderColor: "border-zinc-600",
    dotColor: "#71717a",
  },
  "session-ended": {
    label: "Session",
    color: "text-zinc-300",
    bgColor: "bg-zinc-800",
    borderColor: "border-zinc-600",
    dotColor: "#71717a",
  },
  prompt: {
    label: "Prompt",
    color: "text-blue-300",
    bgColor: "bg-blue-950",
    borderColor: "border-blue-700",
    dotColor: "#60a5fa",
  },
  token: {
    label: "Token",
    color: "text-violet-300",
    bgColor: "bg-violet-950",
    borderColor: "border-violet-700",
    dotColor: "#a78bfa",
  },
  "tool-call": {
    label: "Tool Call",
    color: "text-amber-300",
    bgColor: "bg-amber-950",
    borderColor: "border-amber-700",
    dotColor: "#fbbf24",
  },
  "tool-result": {
    label: "Tool Result",
    color: "text-emerald-300",
    bgColor: "bg-emerald-950",
    borderColor: "border-emerald-700",
    dotColor: "#34d399",
  },
  completion: {
    label: "Completion",
    color: "text-sky-300",
    bgColor: "bg-sky-950",
    borderColor: "border-sky-700",
    dotColor: "#38bdf8",
  },
  error: {
    label: "Error",
    color: "text-red-300",
    bgColor: "bg-red-950",
    borderColor: "border-red-700",
    dotColor: "#f87171",
  },
  "mcp-server-connected": {
    label: "MCP Connected",
    color: "text-teal-300",
    bgColor: "bg-teal-950",
    borderColor: "border-teal-700",
    dotColor: "#2dd4bf",
  },
  "mcp-server-disconnected": {
    label: "MCP Disconnected",
    color: "text-teal-300",
    bgColor: "bg-teal-950",
    borderColor: "border-teal-700",
    dotColor: "#2dd4bf",
  },
  "mcp-tools-listed": {
    label: "MCP Tools",
    color: "text-teal-300",
    bgColor: "bg-teal-950",
    borderColor: "border-teal-700",
    dotColor: "#2dd4bf",
  },
  "mcp-tool-call": {
    label: "MCP Tool Call",
    color: "text-amber-300",
    bgColor: "bg-amber-950",
    borderColor: "border-amber-700",
    dotColor: "#fbbf24",
  },
  "mcp-tool-result": {
    label: "MCP Tool Result",
    color: "text-emerald-300",
    bgColor: "bg-emerald-950",
    borderColor: "border-emerald-700",
    dotColor: "#34d399",
  },
};

export function getEventMeta(type: EventType): EventMeta {
  return META[type];
}

export function eventSummary(event: { type: EventType; [key: string]: unknown }): string {
  switch (event.type) {
    case "session-started":
      return (event.label as string | undefined) ?? "Session started";
    case "session-ended":
      return `Session ended · ${event.durationMs}ms`;
    case "prompt":
      return truncate(event.prompt as string, 72);
    case "token":
      return `"${event.token}" · index ${event.index}`;
    case "tool-call":
      return `${event.toolName}(…)`;
    case "tool-result":
      return `${event.success ? "✓" : "✗"} ${event.toolCallId} · ${event.durationMs ?? 0}ms`;
    case "completion":
      return truncate(event.response as string, 72);
    case "error":
      return event.message as string;
    case "mcp-server-connected":
      return `${event.serverName} connected via ${event.transport}`;
    case "mcp-server-disconnected":
      return `${event.serverName} disconnected${event.reason ? ` · ${event.reason}` : ""}`;
    case "mcp-tools-listed":
      return `${event.serverName} · ${(event.tools as unknown[]).length} tool(s)`;
    case "mcp-tool-call":
      return `${event.serverName}/${event.toolName}(…)`;
    case "mcp-tool-result":
      return `${event.success ? "✓" : "✗"} ${event.toolCallId} · ${event.durationMs ?? 0}ms`;
    default:
      return event.type;
  }
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}
