"use client";

import type { AIEvent } from "@flight-recorder/sdk";
import { eventSummary, getEventMeta } from "@/lib/eventMeta";

interface Props {
  event: AIEvent;
  sessionStart: number;
  sessionDuration: number;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export function TimelineRow({
  event,
  sessionStart,
  sessionDuration,
  isSelected,
  isDimmed,
  onClick,
}: Props) {
  const meta = getEventMeta(event.type);
  const relativeMs = event.timestamp - sessionStart;
  const startPct = sessionDuration > 0 ? (relativeMs / sessionDuration) * 100 : 0;

  const duration =
    event.type === "tool-result" && event.durationMs != null ? event.durationMs : null;
  const endPct =
    duration != null && sessionDuration > 0
      ? Math.min(100, ((relativeMs + duration) / sessionDuration) * 100)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full flex items-center gap-3 px-4 py-2 text-left text-sm border-b transition-colors",
        "border-[#2a2a2d]",
        isSelected
          ? "bg-[#1e1e35] border-l-2 border-l-blue-500"
          : "hover:bg-[#1a1a1d] border-l-2 border-l-transparent",
        isDimmed ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      {/* Type badge */}
      <span
        className={[
          "shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
          meta.bgColor,
          meta.color,
        ].join(" ")}
        style={{ minWidth: 72, textAlign: "center" }}
      >
        {meta.label}
      </span>

      {/* Description */}
      <span className="flex-1 truncate font-mono text-xs text-zinc-300">
        {eventSummary(event as never)}
      </span>

      {/* Time label */}
      <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums w-16 text-right">
        +{relativeMs}ms
      </span>

      {/* Waterfall bar */}
      <div className="relative shrink-0 h-4 rounded overflow-hidden" style={{ width: 160 }}>
        <div className="absolute inset-0 bg-[#1a1a1d]" />
        {endPct != null ? (
          // Bar for timed events (tool calls)
          <div
            className="absolute top-1 h-2 rounded"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(2, endPct - startPct)}%`,
              backgroundColor: meta.dotColor,
            }}
          />
        ) : (
          // Dot for instant events
          <div
            className="absolute top-1 w-2 h-2 rounded-full"
            style={{
              left: `${Math.min(97, startPct)}%`,
              backgroundColor: meta.dotColor,
            }}
          />
        )}
      </div>
    </button>
  );
}
