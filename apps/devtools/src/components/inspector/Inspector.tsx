"use client";

import { useSessionStore, selectSelectedEvent } from "@/stores/sessionStore";
import { getEventMeta } from "@/lib/eventMeta";
import { JsonViewer } from "./JsonViewer";

export function Inspector() {
  const event = useSessionStore(selectSelectedEvent);

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
        <p className="text-sm">Select an event to inspect</p>
        <p className="text-xs text-zinc-600">Click any row in the timeline</p>
      </div>
    );
  }

  const meta = getEventMeta(event.type);

  // Build a clean display object (exclude internal fields from top-level display)
  const { id, sessionId, timestamp, type: _type, ...rest } = event;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#161618] border-b border-[#2a2a2d] px-4 py-3 flex items-center gap-3">
        <span
          className={[
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded",
            meta.bgColor,
            meta.color,
          ].join(" ")}
        >
          {meta.label}
        </span>
        <span className="text-xs text-zinc-400 font-mono">{id}</span>
      </div>

      {/* Meta fields */}
      <div className="px-4 py-3 border-b border-[#2a2a2d] space-y-1">
        <Field label="Session" value={sessionId} mono />
        <Field label="Timestamp" value={new Date(timestamp).toISOString()} mono />
        <Field label="Offset" value={`+${timestamp}ms`} mono />
      </div>

      {/* Payload */}
      <div className="px-4 py-3 font-mono text-xs leading-relaxed">
        <JsonViewer value={rest as Record<string, unknown>} />
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-zinc-500 w-20 shrink-0">{label}</span>
      <span className={mono ? "font-mono text-zinc-300 truncate" : "text-zinc-300 truncate"}>
        {value}
      </span>
    </div>
  );
}
