"use client";

export type TabId = "timeline" | "waterfall" | "cost";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "timeline", label: "Timeline" },
  { id: "waterfall", label: "Waterfall" },
  { id: "cost", label: "Cost Analysis" },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <div className="flex items-center border-b border-[#2a2a2d] bg-[#0d0d0e] px-2 shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            "text-sm px-4 py-2.5 border-b-2 transition-colors -mb-px whitespace-nowrap",
            tab.id === active
              ? "border-blue-500 text-blue-300"
              : "border-transparent text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
