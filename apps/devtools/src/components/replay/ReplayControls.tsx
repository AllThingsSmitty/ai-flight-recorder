"use client";

import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";
import { useReplayStore } from "@/stores/replayStore";
import { formatDuration } from "@flight-recorder/sdk";
import type { ReplaySpeed } from "@flight-recorder/sdk";

const SPEEDS: ReplaySpeed[] = [0.25, 0.5, 1, 2, 4, 8];

export function ReplayControls() {
  const session = useSessionStore(selectActiveSession);
  const { isReplayMode, replayState, initReplay, exitReplay, play, pause, seek, setSpeed, reset } =
    useReplayStore();

  if (!session) return null;

  if (!isReplayMode) {
    return (
      <div className="h-12 border-t border-[#2a2a2d] bg-[#161618] flex items-center px-4 gap-3">
        <button
          onClick={() => initReplay(session)}
          className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
        >
          <PlayIcon className="w-3 h-3" />
          Replay Session
        </button>
        <span className="text-xs text-zinc-500">
          {session.events.length} events · {formatDuration((session.endedAt ?? session.startedAt) - session.startedAt)}
        </span>
      </div>
    );
  }

  if (!replayState) return null;

  const { status, speed, currentTime, duration } = replayState;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = status === "playing";
  const isEnded = status === "ended";

  return (
    <div className="border-t border-[#2a2a2d] bg-[#161618] px-4 py-2 space-y-2">
      {/* Seek bar */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-zinc-400 w-14 text-right tabular-nums">
          {formatDuration(currentTime)}
        </span>
        <div className="relative flex-1 h-1.5 rounded-full bg-[#2a2a2d] cursor-pointer group">
          <div
            className="absolute h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-[11px] font-mono text-zinc-400 w-14 tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Reset */}
        <button
          onClick={() => reset()}
          className="text-zinc-400 hover:text-white transition-colors"
          title="Reset"
        >
          <ResetIcon className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={() => (isPlaying ? pause() : play())}
          disabled={isEnded && progress >= 100}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-3 h-3 text-white" />
          ) : (
            <PlayIcon className="w-3.5 h-3.5 text-white" />
          )}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={[
                "text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors",
                s === speed
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#2a2a2d]",
              ].join(" ")}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Status */}
        <span className="text-[11px] text-zinc-500 capitalize">{status}</span>

        {/* Exit */}
        <button
          onClick={exitReplay}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Exit Replay
        </button>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8a6 6 0 1 1 1.5 4" strokeLinecap="round" />
      <path d="M2 12V8h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
