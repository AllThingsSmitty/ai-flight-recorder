"use client";

import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";
import { useReplayStore } from "@/stores/replayStore";
import { useSearchStore, applyFilters } from "@/stores/searchStore";
import { TimelineRow } from "./TimelineRow";
import type { AIEvent } from "@flight-recorder/sdk";

interface CollapsedRow {
  representativeId: string;
  event: AIEvent;
}

function collapseTokens(events: AIEvent[]): CollapsedRow[] {
  const rows: CollapsedRow[] = [];
  let i = 0;

  while (i < events.length) {
    const event = events[i];

    if (event.type === "token") {
      const start = i;
      while (i < events.length && events[i].type === "token") i++;
      const assembled = events
        .slice(start, i)
        .map((e) => (e.type === "token" ? e.token : ""))
        .join("");
      rows.push({
        representativeId: event.id,
        event: { ...event, token: assembled, index: i - start } as AIEvent,
      });
    } else {
      rows.push({ representativeId: event.id, event });
      i++;
    }
  }

  return rows;
}

export function Timeline() {
  const { selectedEventId, setSelectedEvent } = useSessionStore();
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
  const rows = collapseTokens(filtered);

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a2d] text-[11px] text-zinc-500 uppercase tracking-wider sticky top-0 bg-[#0d0d0e] z-10">
        <span style={{ minWidth: 72 }}>Type</span>
        <span className="flex-1">Description</span>
        <span className="w-16 text-right">Offset</span>
        <span style={{ width: 160 }} className="text-right pr-1">
          Timeline
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
          No matching events
        </div>
      ) : (
        rows.map((row) => (
          <TimelineRow
            key={row.representativeId}
            event={row.event}
            sessionStart={session.startedAt}
            sessionDuration={duration}
            isSelected={selectedEventId === row.representativeId}
            isDimmed={isReplayMode && !visibleEventIds.has(row.representativeId)}
            onClick={() => setSelectedEvent(row.representativeId)}
          />
        ))
      )}
    </div>
  );
}
