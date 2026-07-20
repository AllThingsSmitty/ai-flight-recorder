import { AIEvent } from "../events/AIEvent";

export type SessionStatus = "recording" | "ended";

export interface Session {
  readonly id: string;
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly status: SessionStatus;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly events: readonly AIEvent[];
}

export function sessionDurationMs(session: Session): number {
  const end = session.endedAt ?? (session.events.at(-1)?.timestamp ?? session.startedAt);
  return end - session.startedAt;
}

export function sessionTotalTokens(session: Session): number {
  return session.events.reduce((sum, e) => {
    if (e.type === "completion" && e.totalTokens != null) return sum + e.totalTokens;
    return sum;
  }, 0);
}

export function sessionEstimatedCost(session: Session): number {
  return session.events.reduce((sum, e) => {
    if (e.type === "completion" && e.estimatedCost != null) return sum + e.estimatedCost;
    return sum;
  }, 0);
}
