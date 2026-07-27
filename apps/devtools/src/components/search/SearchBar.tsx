"use client";

import { useSearchStore } from "@/stores/searchStore";
import type { EventType } from "@ai-flight-recorder/sdk";

const FILTER_TYPES: EventType[] = [
  "prompt",
  "token",
  "tool-call",
  "tool-result",
  "completion",
  "error",
];

const CHIP_STYLES: Partial<Record<EventType, string>> = {
  prompt: "bg-blue-950 border-blue-700 text-blue-300",
  token: "bg-violet-950 border-violet-700 text-violet-300",
  "tool-call": "bg-amber-950 border-amber-700 text-amber-300",
  "tool-result": "bg-emerald-950 border-emerald-700 text-emerald-300",
  completion: "bg-sky-950 border-sky-700 text-sky-300",
  error: "bg-red-950 border-red-700 text-red-300",
};

const CHIP_LABELS: Partial<Record<EventType, string>> = {
  prompt: "Prompt",
  token: "Token",
  "tool-call": "Tool",
  "tool-result": "Result",
  completion: "Completion",
  error: "Error",
};

export function SearchBar() {
  const { query, activeTypes, setQuery, toggleType, clearFilters } = useSearchStore();
  const hasFilters = query.length > 0 || activeTypes.length > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a2d] bg-[#0d0d0e] flex-wrap">
      {/* Search input */}
      <div className="relative flex items-center shrink-0">
        <SearchIcon className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter events…"
          className="pl-8 pr-7 py-1.5 text-xs bg-[#1e1e21] border border-[#2a2a2d] rounded text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600 w-48 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 text-zinc-500 hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TYPES.map((type) => {
          const isActive = activeTypes.includes(type);
          const style = CHIP_STYLES[type] ?? "bg-zinc-800 border-zinc-600 text-zinc-300";
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={[
                "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-opacity",
                style,
                isActive ? "opacity-100" : "opacity-30 hover:opacity-60",
              ].join(" ")}
            >
              {CHIP_LABELS[type]}
            </button>
          );
        })}
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M10 10L14 14" strokeLinecap="round" />
    </svg>
  );
}
