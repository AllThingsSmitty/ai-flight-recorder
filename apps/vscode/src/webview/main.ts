interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

interface Session {
  id: string;
  label?: string;
  startedAt: number;
  endedAt?: number;
  events: BaseEvent[];
}

// --- helpers (declared first so they're available during rendering) ---

interface BadgeMeta { label: string; bg: string; fg: string; }

const BADGE: Record<string, BadgeMeta> = {
  "session-started":          { label: "Session",           bg: "#18181b", fg: "#a1a1aa" },
  "session-ended":            { label: "Session",           bg: "#18181b", fg: "#a1a1aa" },
  "prompt":                   { label: "Prompt",            bg: "#172554", fg: "#93c5fd" },
  "token":                    { label: "Token",             bg: "#2e1065", fg: "#c4b5fd" },
  "tool-call":                { label: "Tool Call",         bg: "#451a03", fg: "#fcd34d" },
  "tool-result":              { label: "Tool Result",       bg: "#052e16", fg: "#6ee7b7" },
  "completion":               { label: "Completion",        bg: "#082f49", fg: "#7dd3fc" },
  "error":                    { label: "Error",             bg: "#450a0a", fg: "#fca5a5" },
  "mcp-server-connected":     { label: "MCP Connected",    bg: "#042f2e", fg: "#5eead4" },
  "mcp-server-disconnected":  { label: "MCP Disconnected", bg: "#042f2e", fg: "#5eead4" },
  "mcp-tools-listed":         { label: "MCP Tools",        bg: "#042f2e", fg: "#5eead4" },
  "mcp-tool-call":            { label: "MCP Tool Call",    bg: "#451a03", fg: "#fcd34d" },
  "mcp-tool-result":          { label: "MCP Tool Result",  bg: "#052e16", fg: "#6ee7b7" },
  "retrieval-query":          { label: "Retrieval Query",  bg: "#2d0a42", fg: "#f0abfc" },
  "retrieval-result":         { label: "Retrieval Result", bg: "#2d0a42", fg: "#f0abfc" },
  "agent-run-started":        { label: "Agent Start",      bg: "#431407", fg: "#fdba74" },
  "agent-run-ended":          { label: "Agent End",        bg: "#431407", fg: "#fdba74" },
  "agent-step":               { label: "Agent Step",       bg: "#431407", fg: "#fdba74" },
  "agent-handoff":            { label: "Agent Handoff",    bg: "#431407", fg: "#fdba74" },
};

function summarize(e: BaseEvent): string {
  const s = (v: unknown, max = 80): string => {
    const t = typeof v === "string" ? v : String(v ?? "");
    return t.length > max ? t.slice(0, max) + "…" : t;
  };
  switch (e.type) {
    case "session-started":         return (e.label as string | undefined) ?? "Session started";
    case "session-ended":           return `Session ended · ${e.durationMs}ms`;
    case "prompt":                  return s(e.prompt);
    case "token":                   return `"${e.token}" · index ${e.index}`;
    case "tool-call":               return `${e.toolName}(…)`;
    case "tool-result":             return `${e.success ? "✓" : "✗"} ${e.toolCallId} · ${e.durationMs ?? 0}ms`;
    case "completion":              return s(e.response);
    case "error":                   return s(e.message);
    case "mcp-server-connected":    return `${e.serverName} connected via ${e.transport}`;
    case "mcp-server-disconnected": return `${e.serverName} disconnected${e.reason ? ` · ${e.reason}` : ""}`;
    case "mcp-tools-listed":        return `${e.serverName} · ${(e.tools as unknown[]).length} tool(s)`;
    case "mcp-tool-call":           return `${e.serverName}/${e.toolName}(…)`;
    case "mcp-tool-result":         return `${e.success ? "✓" : "✗"} ${e.toolCallId} · ${e.durationMs ?? 0}ms`;
    case "retrieval-query":         return s(e.query);
    case "retrieval-result":        return `${(e.chunks as unknown[]).length} chunk(s)${e.store ? ` · ${e.store}` : ""} · ${e.durationMs ?? 0}ms`;
    case "agent-run-started":       return `${e.agentName}${e.goal ? ` · ${s(e.goal, 48)}` : ""}`;
    case "agent-run-ended":         return `${e.agentName} · ${e.outcome}${e.durationMs ? ` · ${e.durationMs}ms` : ""}`;
    case "agent-step":              return `${e.agentName} · step ${e.stepIndex}${e.action ? ` · ${e.action}` : ""}`;
    case "agent-handoff":           return `${e.fromAgent} → ${e.toAgent}${e.reason ? ` · ${e.reason}` : ""}`;
    default:                        return e.type;
  }
}

function fmtOffset(ms: number): string {
  return ms < 1000 ? `+${ms}ms` : `+${(ms / 1000).toFixed(2)}s`;
}

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function mkEl(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function set(id: string, text: string): void {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function highlightJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2);
  return raw.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],:])/g,
    (token) => {
      if (token === "true" || token === "false") return `<span class="jb">${token}</span>`;
      if (token === "null")                       return `<span class="jz">${token}</span>`;
      if (/^[{}[\],:]$/.test(token))             return `<span class="jp">${esc(token)}</span>`;
      if (/^-?\d/.test(token))                   return `<span class="jn">${token}</span>`;
      if (/"$/.test(token))                      return `<span class="jk">${esc(token)}</span>`; // key (ends with ":")
      return `<span class="js">${esc(token)}</span>`; // string value
    },
  );
}

// --- render ---

const { session } = (window as unknown as { __SESSION__: { session: Session } }).__SESSION__;

(document.getElementById("label") as HTMLElement).textContent =
  session.label ?? session.id;

const durationMs = session.endedAt ? session.endedAt - session.startedAt : null;
const totalTokens = session.events.reduce((n: number, e: BaseEvent) => {
  return e.type === "completion" && typeof e.totalTokens === "number" ? n + e.totalTokens : n;
}, 0);
const totalCost = session.events.reduce((n: number, e: BaseEvent) => {
  return e.type === "completion" && typeof e.estimatedCost === "number" ? n + e.estimatedCost : n;
}, 0);

set("s-dur", durationMs !== null ? fmtDuration(durationMs) : "—");
set("s-ev", String(session.events.length));
set("s-tok", totalTokens > 0 ? totalTokens.toLocaleString() : "—");
set("s-cost", totalCost > 0 ? "$" + totalCost.toFixed(6) : "—");

const container = document.getElementById("events") as HTMLElement;

if (session.events.length === 0) {
  container.innerHTML = '<div id="empty">No events recorded</div>';
} else {
  const frag = document.createDocumentFragment();
  for (const event of session.events) {
    const meta = BADGE[event.type] ?? { label: event.type, bg: "#27272a", fg: "#a1a1aa" };
    const offsetMs = event.timestamp - session.startedAt;

    const row = mkEl("div", "row");
    const chevron = mkEl("span", "chevron");
    chevron.textContent = "▶";
    const time = mkEl("span", "time");
    time.textContent = fmtOffset(offsetMs);
    const badge = mkEl("span", "badge");
    badge.textContent = meta.label;
    badge.style.background = meta.bg;
    badge.style.color = meta.fg;
    const summary = mkEl("span", "summary");
    const text = summarize(event);
    summary.textContent = text;
    summary.title = text;

    row.append(chevron, time, badge, summary);

    const detail = mkEl("div", "detail");
    const pre = document.createElement("pre");
    pre.innerHTML = highlightJson(event);
    detail.appendChild(pre);

    row.addEventListener("click", () => {
      const open = detail.classList.toggle("open");
      row.classList.toggle("expanded", open);
    });

    frag.appendChild(row);
    frag.appendChild(detail);
  }
  container.appendChild(frag);
}
