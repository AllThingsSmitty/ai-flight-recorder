"use client";

import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";
import { formatDuration } from "@ai-flight-recorder/sdk";

export function SessionStats() {
  const session = useSessionStore(selectActiveSession);

  if (!session) return null;

  const duration =
    session.endedAt != null ? session.endedAt - session.startedAt : null;

  const totalTokens = session.events.reduce((acc, e) => {
    if (e.type === "completion" && e.totalTokens != null)
      return acc + e.totalTokens;
    return acc;
  }, 0);

  const estimatedCost = session.events.reduce((acc, e) => {
    if (e.type === "completion" && e.estimatedCost != null)
      return acc + e.estimatedCost;
    return acc;
  }, 0);

  const models = [
    ...new Set(
      session.events
        .filter((e) => e.type === "prompt")
        .map((e) => (e.type === "prompt" ? e.model : "")),
    ),
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-6 px-5 py-2 border-b border-[#2a2a2d] bg-[#0d0d0e]">
      {models.length > 0 && <Stat label="Model" value={models.join(", ")} />}
      {duration != null && (
        <Stat label="Duration" value={formatDuration(duration)} />
      )}
      {totalTokens > 0 && (
        <Stat label="Tokens" value={totalTokens.toLocaleString()} />
      )}
      {estimatedCost > 0 && (
        <Stat label="Est. Cost" value={`$${estimatedCost.toFixed(6)}`} />
      )}
      <Stat label="Events" value={String(session.events.length)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-mono">{value}</span>
    </div>
  );
}
