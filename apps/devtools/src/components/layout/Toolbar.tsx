"use client";

import { useRef, useState } from "react";
import { SessionPicker } from "@/components/session/SessionPicker";
import { useSessionStore, selectActiveSession } from "@/stores/sessionStore";
import { downloadSession, readFlightFile } from "@/lib/fileIO";

export function Toolbar() {
  const activeSession = useSessionStore(selectActiveSession);
  const importSession = useSessionStore((s) => s.importSession);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    if (!activeSession) return;
    downloadSession(activeSession);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-imported after an error
    e.target.value = "";

    try {
      const session = await readFlightFile(file);
      const { alreadyExists } = importSession(session);
      if (alreadyExists) {
        setImportError(
          `Session "${session.label ?? session.id}" is already open.`,
        );
        setTimeout(() => setImportError(null), 4000);
      } else {
        setActiveSession(session.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import file.";
      setImportError(msg);
      setTimeout(() => setImportError(null), 6000);
    }
  }

  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-[#2a2a2d] bg-[#0d0d0e] shrink-0 relative">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <FlightIcon className="w-5 h-5" />
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">
          AI Flight Recorder
        </span>
      </div>

      <div className="w-px h-5 bg-[#2a2a2d]" />

      <SessionPicker />

      <div className="flex-1" />

      {/* Import error toast */}
      {importError && (
        <span className="text-[11px] text-red-400 font-mono max-w-[320px] truncate">
          {importError}
        </span>
      )}

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={!activeSession || activeSession.status !== "ended"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
          text-zinc-300 bg-[#1a1a1d] border border-[#2a2a2d]
          hover:bg-[#222225] hover:text-zinc-100 hover:border-zinc-600
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
        title={
          activeSession?.status === "ended"
            ? "Export session as .flight file"
            : "Session must be ended before exporting"
        }
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        Export
      </button>

      {/* Import */}
      <button
        onClick={handleImportClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
          text-zinc-300 bg-[#1a1a1d] border border-[#2a2a2d]
          hover:bg-[#222225] hover:text-zinc-100 hover:border-zinc-600
          transition-colors"
        title="Open a .flight session file"
      >
        <UploadIcon className="w-3.5 h-3.5" />
        Import
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".flight,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-px h-5 bg-[#2a2a2d]" />

      <span className="text-[11px] text-zinc-600 font-mono">v0.1.2</span>
    </header>
  );
}

function FlightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="14" y="36" width="100" height="60" rx="10" fill="#f97316" />
      <rect x="14" y="36" width="100" height="18" rx="10" fill="#c2410c" />
      <rect x="14" y="46" width="100" height="8" fill="#c2410c" />
      <polyline
        points="26,67 38,50 50,80 62,57 74,73 86,48 102,67"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <circle cx="97" cy="45" r="6" fill="#fef2f2" />
      <circle cx="97" cy="45" r="3.5" fill="#ef4444" />
      <circle cx="26" cy="85" r="3.5" fill="#ea6a00" />
      <circle cx="102" cy="85" r="3.5" fill="#ea6a00" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M12 3v13m0 0l-4-4m4 4l4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M12 16V3m0 0l-4 4m4-4l4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  );
}
