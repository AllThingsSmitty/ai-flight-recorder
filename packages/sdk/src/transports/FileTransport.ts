/**
 * Node.js-only transport that persists sessions as `.flight` files on disk.
 *
 * Usage:
 *   import { FileTransport } from "@ai-flight-recorder/sdk";
 *
 *   const transport = new FileTransport("./recordings");
 *   recorder.subscribe((event) => {
 *     if (event.type === "session-ended") {
 *       transport.save(recorder.session!);
 *     }
 *   });
 *
 *   // Later, load all saved sessions:
 *   const sessions = transport.loadAll();
 *
 * This module uses Node.js `fs` — do not import it in browser environments.
 * Import from "@ai-flight-recorder/sdk/node" to keep it out of browser bundles.
 */

import fs from "node:fs";
import path from "node:path";
import {
  Session,
  Transport,
  serializeSession,
  deserializeSession,
} from "@ai-flight-recorder/core";

export class FileTransport implements Transport {
  private _dir: string;

  constructor(dir: string) {
    this._dir = path.resolve(dir);
    if (!fs.existsSync(this._dir)) {
      fs.mkdirSync(this._dir, { recursive: true });
    }
  }

  /** Synchronously save a session to `<dir>/<sessionId>.flight`. */
  save(session: Session): void {
    fs.writeFileSync(this._filePath(session.id), serializeSession(session), "utf-8");
  }

  /** Asynchronously save a session to `<dir>/<sessionId>.flight`. */
  async saveAsync(session: Session): Promise<void> {
    await fs.promises.writeFile(this._filePath(session.id), serializeSession(session), "utf-8");
  }

  /** Returns the filesystem path for a given session ID without writing anything. */
  filePath(sessionId: string): string {
    return this._filePath(sessionId);
  }

  /** Load a single `.flight` file from an absolute or relative path. */
  load(filePath: string): Session {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(this._dir, filePath);
    const data = fs.readFileSync(resolved, "utf-8");
    return deserializeSession(data);
  }

  /** Load all `.flight` files in the transport directory. */
  loadAll(): Session[] {
    const files = fs.readdirSync(this._dir).filter((f) => f.endsWith(".flight"));
    const sessions: Session[] = [];
    for (const file of files) {
      try {
        sessions.push(this.load(file));
      } catch {
        // Skip files that fail to parse — they may be corrupted
      }
    }
    return sessions;
  }

  /** Delete the `.flight` file for a given session ID. Returns true if deleted. */
  delete(sessionId: string): boolean {
    const filePath = this._filePath(sessionId);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  /** List all session IDs stored in the transport directory. */
  list(): string[] {
    return fs
      .readdirSync(this._dir)
      .filter((f) => f.endsWith(".flight"))
      .map((f) => path.basename(f, ".flight"));
  }

  get directory(): string {
    return this._dir;
  }

  private _filePath(sessionId: string): string {
    return path.join(this._dir, `${sessionId}.flight`);
  }
}
