import type { Session } from "./Session";

// Known event types at this schema version. Used to warn (not reject) unknown types so
// .flight files from newer SDK versions can still be opened by older DevTools builds.
const KNOWN_EVENT_TYPES = new Set([
  "session-started", "session-ended",
  "prompt", "token", "tool-call", "tool-result", "completion", "error",
  "mcp-server-connected", "mcp-server-disconnected", "mcp-tools-listed",
  "mcp-tool-call", "mcp-tool-result",
  "retrieval-query", "retrieval-result",
  "agent-run-started", "agent-run-ended", "agent-step", "agent-handoff",
]);

export const FLIGHT_FILE_VERSION = "1" as const;

/** Envelope stored in a `.flight` file */
export interface FlightFile {
  version: typeof FLIGHT_FILE_VERSION;
  exportedAt: number;
  session: Session;
}

/**
 * Serialize a session to a JSON string suitable for saving as a `.flight` file.
 * The session must have `status: "ended"` — in-progress sessions cannot be exported.
 */
export function serializeSession(session: Session): string {
  if (session.status !== "ended") {
    throw new Error(
      `Cannot export session "${session.id}": session is still recording. Call endSession() first.`
    );
  }

  const file: FlightFile = {
    version: FLIGHT_FILE_VERSION,
    exportedAt: Date.now(),
    session,
  };

  return JSON.stringify(file, null, 2);
}

/**
 * Parse and validate a `.flight` file string, returning the contained Session.
 * Throws a descriptive error if the file is invalid or from an unsupported version.
 */
export function deserializeSession(data: string): Session {
  return parseFlightFile(data).session;
}

/** Parse the full envelope, including version and exportedAt metadata. */
export function parseFlightFile(data: string): FlightFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Invalid .flight file: not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid .flight file: expected a JSON object at the root.");
  }

  const raw = parsed as Record<string, unknown>;

  if (!("version" in raw)) {
    throw new Error("Invalid .flight file: missing 'version' field.");
  }

  if (raw.version !== FLIGHT_FILE_VERSION) {
    throw new Error(
      `Unsupported .flight file version "${raw.version}". Expected "${FLIGHT_FILE_VERSION}".`
    );
  }

  if (typeof raw.exportedAt !== "number") {
    throw new Error("Invalid .flight file: 'exportedAt' must be a number.");
  }

  _validateSession(raw.session);

  return raw as unknown as FlightFile;
}

function _validateSession(raw: unknown): asserts raw is Session {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid .flight file: 'session' must be an object.");
  }

  const s = raw as Record<string, unknown>;

  for (const field of ["id", "status", "startedAt"] as const) {
    if (!(field in s)) {
      throw new Error(`Invalid .flight file: session is missing required field '${field}'.`);
    }
  }

  if (typeof s.id !== "string") {
    throw new Error("Invalid .flight file: session.id must be a string.");
  }

  if (s.status !== "recording" && s.status !== "ended") {
    throw new Error(
      `Invalid .flight file: session.status must be "recording" or "ended", got "${s.status}".`
    );
  }

  if (typeof s.startedAt !== "number") {
    throw new Error("Invalid .flight file: session.startedAt must be a number.");
  }

  if (!Array.isArray(s.events)) {
    throw new Error("Invalid .flight file: session.events must be an array.");
  }

  for (let i = 0; i < (s.events as unknown[]).length; i++) {
    const event = (s.events as unknown[])[i];
    if (!event || typeof event !== "object") {
      throw new Error(`Invalid .flight file: session.events[${i}] must be an object.`);
    }
    const e = event as Record<string, unknown>;
    for (const field of ["id", "sessionId", "timestamp", "type"]) {
      if (!(field in e)) {
        throw new Error(
          `Invalid .flight file: session.events[${i}] is missing required field '${field}'.`
        );
      }
    }
    if (typeof e.type !== "string" || e.type === "") {
      throw new Error(
        `Invalid .flight file: session.events[${i}].type must be a non-empty string, got ${JSON.stringify(e.type)}.`
      );
    }
    if (!KNOWN_EVENT_TYPES.has(e.type)) {
      console.warn(
        `[ai-flight-recorder] Unknown event type "${e.type}" at events[${i}] — file may be from a newer SDK version.`
      );
    }
  }
}
