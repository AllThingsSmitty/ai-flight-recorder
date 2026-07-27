"use client";

import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";
import { useReplayStore } from "@/stores/replayStore";
import { useSearchStore, applyFilters } from "@/stores/searchStore";
import { getEventMeta } from "@/lib/eventMeta";
import type { AIEvent } from "@ai-flight-recorder/sdk";

function tickInterval(durationMs: number): number {
  if (durationMs <= 1_000) return 100;
  if (durationMs <= 5_000) return 500;
  if (durationMs <= 15_000) return 1_000;
  if (durationMs <= 60_000) return 5_000;
  return 10_000;
}

function formatTick(ms: number): string {
  if (ms === 0) return "0";
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(ms % 1_000 === 0 ? 0 : 1)}s`;
}

interface WaterfallRow {
  event: AIEvent;
  spanMs?: number;
  groupCount?: number;
}

function buildRows(events: AIEvent[]): WaterfallRow[] {
  const rows: WaterfallRow[] = [];
  let i = 0;
  while (i < events.length) {
    const event = events[i];
    if (event.type === "token") {
      let lastTs = event.timestamp;
      let count = 0;
      while (i < events.length && events[i].type === "token") {
        lastTs = events[i].timestamp;
        count++;
        i++;
      }
      rows.push({ event, spanMs: lastTs - event.timestamp, groupCount: count });
    } else {
      rows.push({ event });
      i++;
    }
  }
  return rows;
}

export function Waterfall() {
  const session = useSessionStore(selectActiveSession);
  const { isReplayMode, visibleEventIds } = useReplayStore();
  const { query, activeTypes } = useSearchStore();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No session selected
      </div>
    );
  }

  const duration =
    (session.endedAt ?? session.events.at(-1)?.timestamp ?? session.startedAt) -
    session.startedAt;

  const filtered = applyFilters(session.events, query, activeTypes);
  const rows = buildRows(filtered);

  const interval = tickInterval(duration);
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += interval) ticks.push(t);

  // Build tool-call → result duration map for span bars
  const toolSpans = new Map<string, number>();
  for (const e of session.events) {
    if (e.type === "tool-result" && e.durationMs != null) {
      toolSpans.set(e.toolCallId, e.durationMs);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No matching events
      </div>
    );
  }

  return (
    <div className="p-4 overflow-x-auto">
      {/* Time axis */}
      <div className="flex items-end mb-1 pl-24" style={{ position: "relative", height: 20 }}>
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#2a2a2d] ml-24" />
        {ticks.map((tick) => {
          const pct = duration > 0 ? (tick / duration) * 100 : 0;
          return (
            <div
              key={tick}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `calc(96px + ${pct}% * (100% - 96px) / 100)` }}
            >
              <span className="text-[9px] text-zinc-600 tabular-nums whitespace-nowrap mb-1">
                {formatTick(tick)}
              </span>
              <div className="w-px h-1.5 bg-[#2a2a2d]" />
            </div>
          );
        })}
      </div>

      {/* Event rows */}
      <div className="space-y-0.5 min-w-0">
        {rows.map(({ event, spanMs, groupCount }) => {
          const meta = getEventMeta(event.type);
          const relativeMs = event.timestamp - session.startedAt;
          const startPct = duration > 0 ? (relativeMs / duration) * 100 : 0;

          // Determine bar width
          let barWidthPct = 0;
          if (event.type === "token" && spanMs != null && spanMs > 0) {
            barWidthPct = (spanMs / duration) * 100;
          } else if (event.type === "tool-call") {
            const dur = toolSpans.get(event.toolCallId);
            if (dur != null) barWidthPct = (dur / duration) * 100;
          }

          const isDimmed = isReplayMode && !visibleEventIds.has(event.id);

          return (
            <div
              key={event.id}
              className={`flex items-center gap-2 h-6 transition-opacity ${isDimmed ? "opacity-25" : ""}`}
            >
              {/* Type label */}
              <span
                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider text-right ${meta.color}`}
                style={{ width: 88 }}
              >
                {event.type === "token" && groupCount != null
                  ? `${groupCount} tokens`
                  : meta.label}
              </span>

              {/* Bar track */}
              <div
                className="relative flex-1 h-3 rounded"
                style={{ background: "#1a1a1d" }}
              >
                {/* Grid lines from ticks */}
                {ticks.slice(1).map((tick) => {
                  const pct = duration > 0 ? (tick / duration) * 100 : 0;
                  return (
                    <div
                      key={tick}
                      className="absolute top-0 h-full w-px"
                      style={{ left: `${pct}%`, background: "#2a2a2d" }}
                    />
                  );
                })}

                {barWidthPct > 0 ? (
                  <div
                    className="absolute top-1 h-1.5 rounded"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(0.5, barWidthPct)}%`,
                      backgroundColor: meta.dotColor,
                      opacity: 0.85,
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-1 w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.min(97, startPct)}%`,
                      transform: "translateX(-50%)",
                      backgroundColor: meta.dotColor,
                    }}
                  />
                )}
              </div>

              {/* Duration label */}
              {barWidthPct > 0 && (
                <span className="shrink-0 text-[10px] font-mono text-zinc-500 w-12">
                  {event.type === "tool-call"
                    ? `${toolSpans.get(event.toolCallId) ?? 0}ms`
                    : spanMs != null
                      ? `${spanMs}ms`
                      : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
