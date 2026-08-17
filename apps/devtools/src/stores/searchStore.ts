import { create } from "zustand";
import type { AIEvent, EventType } from "@ai-flight-recorder/sdk";

interface SearchState {
  query: string;
  activeTypes: EventType[];
  setQuery: (q: string) => void;
  toggleType: (t: EventType) => void;
  clearFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  activeTypes: [],

  setQuery: (query) => set({ query }),

  toggleType: (type) =>
    set((state) => ({
      activeTypes: state.activeTypes.includes(type)
        ? state.activeTypes.filter((t) => t !== type)
        : [...state.activeTypes, type],
    })),

  clearFilters: () => set({ query: "", activeTypes: [] }),
}));

export function matchesQuery(event: AIEvent, q: string): boolean {
  const lower = q.toLowerCase();
  switch (event.type) {
    case "prompt":
      return (
        event.prompt.toLowerCase().includes(lower) ||
        event.model.toLowerCase().includes(lower)
      );
    case "completion":
      return event.response.toLowerCase().includes(lower);
    case "token":
      return event.token.toLowerCase().includes(lower);
    case "tool-call":
      return (
        event.toolName.toLowerCase().includes(lower) ||
        JSON.stringify(event.input).toLowerCase().includes(lower)
      );
    case "tool-result":
      return JSON.stringify(event.output).toLowerCase().includes(lower);
    case "error":
      return event.message.toLowerCase().includes(lower);
    case "session-started":
      return (event.label ?? "").toLowerCase().includes(lower);
    case "mcp-server-connected":
      return (
        event.serverName.toLowerCase().includes(lower) ||
        event.transport.toLowerCase().includes(lower) ||
        (event.serverVersion ?? "").toLowerCase().includes(lower)
      );
    case "mcp-server-disconnected":
      return (
        event.serverName.toLowerCase().includes(lower) ||
        (event.reason ?? "").toLowerCase().includes(lower)
      );
    case "mcp-tools-listed":
      return (
        event.serverName.toLowerCase().includes(lower) ||
        event.tools.some(
          (t) =>
            t.name.toLowerCase().includes(lower) ||
            (t.description ?? "").toLowerCase().includes(lower)
        )
      );
    case "mcp-tool-call":
      return (
        event.serverName.toLowerCase().includes(lower) ||
        event.toolName.toLowerCase().includes(lower) ||
        event.toolCallId.toLowerCase().includes(lower) ||
        JSON.stringify(event.input).toLowerCase().includes(lower)
      );
    case "mcp-tool-result":
      return (
        event.serverName.toLowerCase().includes(lower) ||
        event.toolCallId.toLowerCase().includes(lower) ||
        JSON.stringify(event.output).toLowerCase().includes(lower)
      );
    case "retrieval-query":
      return (
        event.query.toLowerCase().includes(lower) ||
        (event.store ?? "").toLowerCase().includes(lower)
      );
    case "retrieval-result":
      return (
        (event.store ?? "").toLowerCase().includes(lower) ||
        event.chunks.some((c) => c.content.toLowerCase().includes(lower))
      );
    case "agent-run-started":
      return (
        event.agentName.toLowerCase().includes(lower) ||
        (event.goal ?? "").toLowerCase().includes(lower)
      );
    case "agent-run-ended":
      return (
        event.agentName.toLowerCase().includes(lower) ||
        event.outcome.toLowerCase().includes(lower)
      );
    case "agent-step":
      return (
        event.agentName.toLowerCase().includes(lower) ||
        (event.action ?? "").toLowerCase().includes(lower) ||
        (event.thought ?? "").toLowerCase().includes(lower)
      );
    case "agent-handoff":
      return (
        event.fromAgent.toLowerCase().includes(lower) ||
        event.toAgent.toLowerCase().includes(lower) ||
        (event.reason ?? "").toLowerCase().includes(lower)
      );
    default:
      return false;
  }
}

export function applyFilters(
  events: readonly AIEvent[],
  query: string,
  activeTypes: EventType[]
): AIEvent[] {
  let filtered = events as AIEvent[];
  if (activeTypes.length > 0) {
    filtered = filtered.filter((e) => activeTypes.includes(e.type));
  }
  if (query.trim()) {
    filtered = filtered.filter((e) => matchesQuery(e, query));
  }
  return filtered;
}
