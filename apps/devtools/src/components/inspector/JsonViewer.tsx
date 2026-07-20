"use client";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

interface Props {
  value: unknown;
  depth?: number;
}

export function JsonViewer({ value, depth = 0 }: Props) {
  return <Node value={value as JsonValue} depth={depth} />;
}

function Node({ value, depth }: { value: JsonValue; depth: number }) {
  if (value === null) return <span className="text-zinc-500">null</span>;
  if (typeof value === "boolean")
    return <span className="text-amber-400">{String(value)}</span>;
  if (typeof value === "number")
    return <span className="text-sky-400">{value}</span>;
  if (typeof value === "string")
    return <span className="text-emerald-400">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-400">[]</span>;
    return (
      <span>
        <span className="text-zinc-400">[</span>
        <div className="pl-4">
          {value.map((item, i) => (
            <div key={i}>
              <Node value={item} depth={depth + 1} />
              {i < value.length - 1 && <span className="text-zinc-600">,</span>}
            </div>
          ))}
        </div>
        <span className="text-zinc-400">]</span>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-zinc-400">{"{}"}</span>;
    return (
      <span>
        <span className="text-zinc-400">{"{"}</span>
        <div className="pl-4">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="text-zinc-300">&quot;{k}&quot;</span>
              <span className="text-zinc-500">: </span>
              <Node value={v} depth={depth + 1} />
              {i < entries.length - 1 && <span className="text-zinc-600">,</span>}
            </div>
          ))}
        </div>
        <span className="text-zinc-400">{"}"}</span>
      </span>
    );
  }

  return <span className="text-zinc-400">{String(value)}</span>;
}
