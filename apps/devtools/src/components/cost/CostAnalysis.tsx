"use client";

import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";

interface RequestRow {
  index: number;
  model: string;
  prompt: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

function buildRequests(session: ReturnType<typeof selectActiveSession>): RequestRow[] {
  if (!session) return [];
  const rows: RequestRow[] = [];
  let lastModel = "";
  let lastPrompt = "";
  let idx = 0;

  for (const event of session.events) {
    if (event.type === "prompt") {
      lastModel = event.model;
      lastPrompt = event.prompt;
    }
    if (event.type === "completion") {
      rows.push({
        index: idx++,
        model: lastModel,
        prompt: lastPrompt,
        promptTokens: event.promptTokens ?? 0,
        completionTokens: event.completionTokens ?? 0,
        totalTokens: event.totalTokens ?? 0,
        estimatedCost: event.estimatedCost ?? 0,
      });
    }
  }
  return rows;
}

export function CostAnalysis() {
  const session = useSessionStore(selectActiveSession);
  const requests = buildRequests(session);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No session selected
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No completion events found
      </div>
    );
  }

  const totals = requests.reduce(
    (acc, r) => ({
      promptTokens: acc.promptTokens + r.promptTokens,
      completionTokens: acc.completionTokens + r.completionTokens,
      totalTokens: acc.totalTokens + r.totalTokens,
      estimatedCost: acc.estimatedCost + r.estimatedCost,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
  );

  const promptPct =
    totals.totalTokens > 0
      ? Math.round((totals.promptTokens / totals.totalTokens) * 100)
      : 50;

  return (
    <div className="p-5 space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Tokens" value={totals.totalTokens.toLocaleString()} />
        <StatCard
          label="Prompt Tokens"
          value={totals.promptTokens.toLocaleString()}
          sub="input"
        />
        <StatCard
          label="Completion Tokens"
          value={totals.completionTokens.toLocaleString()}
          sub="output"
        />
        <StatCard
          label="Est. Cost"
          value={`$${totals.estimatedCost.toFixed(6)}`}
          accent
        />
      </div>

      {/* Token ratio bar */}
      <div>
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
          <span>
            Prompt{" "}
            <span className="text-blue-400 font-mono">{promptPct}%</span>
          </span>
          <span>
            Completion{" "}
            <span className="text-sky-400 font-mono">{100 - promptPct}%</span>
          </span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-[#2a2a2d]">
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${promptPct}%` }}
          />
          <div
            className="bg-sky-400 transition-all"
            style={{ width: `${100 - promptPct}%` }}
          />
        </div>
      </div>

      {/* Per-request breakdown */}
      <div>
        <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">
          Per Request
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2d]">
                <th className="text-left text-zinc-500 font-normal pb-2 pr-4">#</th>
                <th className="text-left text-zinc-500 font-normal pb-2 pr-4">Model</th>
                <th className="text-left text-zinc-500 font-normal pb-2 pr-4 max-w-xs">
                  Prompt
                </th>
                <th className="text-right text-zinc-500 font-normal pb-2 pr-4">
                  Prompt Tok.
                </th>
                <th className="text-right text-zinc-500 font-normal pb-2 pr-4">
                  Compl. Tok.
                </th>
                <th className="text-right text-zinc-500 font-normal pb-2">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.index} className="border-b border-[#1e1e21] hover:bg-[#161618]">
                  <td className="py-2.5 pr-4 text-zinc-600 tabular-nums">{r.index + 1}</td>
                  <td className="py-2.5 pr-4 font-mono text-zinc-400 whitespace-nowrap">
                    {r.model}
                  </td>
                  <td
                    className="py-2.5 pr-4 text-zinc-300 truncate"
                    style={{ maxWidth: 220 }}
                    title={r.prompt}
                  >
                    {r.prompt.length > 60 ? r.prompt.slice(0, 60) + "…" : r.prompt}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-blue-300 tabular-nums">
                    {r.promptTokens.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-sky-300 tabular-nums">
                    {r.completionTokens.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono text-emerald-400 tabular-nums">
                    ${r.estimatedCost.toFixed(6)}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-[#2a2a2d]">
                <td className="py-2.5 pr-4 text-zinc-400 font-semibold" colSpan={3}>
                  Total
                </td>
                <td className="py-2.5 pr-4 text-right font-mono font-semibold text-blue-300 tabular-nums">
                  {totals.promptTokens.toLocaleString()}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono font-semibold text-sky-300 tabular-nums">
                  {totals.completionTokens.toLocaleString()}
                </td>
                <td className="py-2.5 text-right font-mono font-semibold text-emerald-400 tabular-nums">
                  ${totals.estimatedCost.toFixed(6)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#161618] border border-[#2a2a2d] rounded-lg p-3.5">
      <div className="text-[11px] text-zinc-500 mb-1">
        {label}
        {sub && <span className="ml-1 text-zinc-600">({sub})</span>}
      </div>
      <div
        className={`text-xl font-mono font-semibold tabular-nums ${
          accent ? "text-emerald-400" : "text-zinc-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
