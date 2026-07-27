import type { Session } from "@ai-flight-recorder/sdk";
import { serializeSession, deserializeSession } from "@ai-flight-recorder/sdk";

/**
 * Trigger a browser download of a session as a `.flight` file.
 * Falls back to `session.id` if no filename is given.
 */
export function downloadSession(session: Session, filename?: string): void {
  const json = serializeSession(session);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `${session.label ?? session.id}.flight`;
  anchor.click();

  // Revoke on next tick so the browser has time to begin the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Read a File (from a file input or drag-and-drop) and parse it as a Session.
 * Rejects with a descriptive error if the file is invalid.
 */
export function readFlightFile(file: File): Promise<Session> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          reject(new Error("Failed to read file as text."));
          return;
        }
        resolve(deserializeSession(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsText(file);
  });
}
