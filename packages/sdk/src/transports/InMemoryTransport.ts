import { Session, Transport } from "@flight-recorder/core";

/**
 * Stores recorded sessions in memory. Useful for testing and local development.
 */
export class InMemoryTransport implements Transport {
  private _sessions: Map<string, Session> = new Map();
  private _listeners: Set<(session: Session) => void> = new Set();

  save(session: Session): void {
    this._sessions.set(session.id, session);
    this._listeners.forEach((l) => l(session));
  }

  get(id: string): Session | undefined {
    return this._sessions.get(id);
  }

  getAll(): Session[] {
    return Array.from(this._sessions.values());
  }

  delete(id: string): boolean {
    return this._sessions.delete(id);
  }

  clear(): void {
    this._sessions.clear();
  }

  onSave(listener: (session: Session) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  get size(): number {
    return this._sessions.size;
  }
}
