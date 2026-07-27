"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { formatDuration } from "@ai-flight-recorder/sdk";

export function SessionPicker() {
  const { sessions, activeSessionId, setActiveSession } = useSessionStore();
  const [open, setOpen] = useState(false);

  const active = sessions.find((s) => s.id === activeSessionId);

  if (sessions.length === 0) {
    return <span className="text-sm text-zinc-500">No sessions</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm bg-[#1e1e21] hover:bg-[#26262a] border border-[#2a2a2d] rounded px-3 py-1.5 text-zinc-200 transition-colors"
      >
        <span className="max-w-48 truncate">{active?.label ?? "Select session"}</span>
        <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 6l5 5 5-5H3z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-[#1e1e21] border border-[#2a2a2d] rounded-lg shadow-xl overflow-hidden w-72">
            {sessions.map((s) => {
              const duration = s.endedAt != null ? s.endedAt - s.startedAt : null;
              const totalTokens = s.events.reduce((acc, e) => {
                if (e.type === "completion" && e.totalTokens != null) return acc + e.totalTokens;
                return acc;
              }, 0);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSession(s.id);
                    setOpen(false);
                  }}
                  className={[
                    "w-full text-left px-4 py-3 text-sm hover:bg-[#26262a] transition-colors border-b border-[#2a2a2d] last:border-0",
                    s.id === activeSessionId ? "bg-[#1e1e35]" : "",
                  ].join(" ")}
                >
                  <div className="font-medium text-zinc-200 truncate">{s.label ?? s.id}</div>
                  <div className="flex gap-3 mt-0.5 text-[11px] text-zinc-500">
                    {duration != null && <span>{formatDuration(duration)}</span>}
                    {totalTokens > 0 && <span>{totalTokens.toLocaleString()} tokens</span>}
                    <span>{s.events.length} events</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
