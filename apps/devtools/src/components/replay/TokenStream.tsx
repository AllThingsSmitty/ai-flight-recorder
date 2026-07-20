"use client";

import { useReplayStore } from "@/stores/replayStore";
import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";

export function TokenStream() {
  const { isReplayMode, visibleEventIds, replayState } = useReplayStore();
  const session = useSessionStore(selectActiveSession);

  if (!isReplayMode || !session) return null;

  // Assemble all token text from events that have been "played"
  const lines: string[] = [];
  let current = "";

  for (const event of session.events) {
    if (!visibleEventIds.has(event.id)) continue;

    if (event.type === "token") {
      current += event.token;
    } else if (event.type === "completion" && current) {
      lines.push(current);
      current = "";
    } else if (event.type === "prompt" && current) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);

  if (lines.length === 0 && !current) return null;

  const isPlaying = replayState?.status === "playing";

  return (
    <div className="border-t border-[#2a2a2d] bg-[#161618] px-4 py-3 max-h-32 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Live Output</span>
        {isPlaying && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            streaming
          </span>
        )}
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p key={i} className="text-sm font-mono text-zinc-200 leading-relaxed">
            {line}
          </p>
        ))}
        {current && (
          <p className="text-sm font-mono text-zinc-200 leading-relaxed">
            {current}
            {isPlaying && <span className="inline-block w-0.5 h-4 bg-zinc-300 ml-0.5 animate-pulse align-text-bottom" />}
          </p>
        )}
      </div>
    </div>
  );
}
