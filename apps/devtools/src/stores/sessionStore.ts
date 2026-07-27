import { create } from "zustand";
import type { AIEvent, Session } from "@ai-flight-recorder/sdk";

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  selectedEventId: string | null;
  addSession: (session: Session) => void;
  importSession: (session: Session) => { alreadyExists: boolean };
  setActiveSession: (id: string) => void;
  setSelectedEvent: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  selectedEventId: null,

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: state.activeSessionId ?? session.id,
    })),

  importSession: (session) => {
    const exists = get().sessions.some((s) => s.id === session.id);
    if (!exists) {
      set((state) => ({
        sessions: [...state.sessions, session],
        activeSessionId: state.activeSessionId ?? session.id,
      }));
    }
    return { alreadyExists: exists };
  },

  setActiveSession: (id) =>
    set({ activeSessionId: id, selectedEventId: null }),

  setSelectedEvent: (id) =>
    set({ selectedEventId: id }),
}));

// Derived selectors
export function selectActiveSession(state: SessionState): Session | null {
  return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
}

export function selectSelectedEvent(state: SessionState): AIEvent | null {
  const session = selectActiveSession(state);
  if (!session || !state.selectedEventId) return null;
  return (session.events.find((e) => e.id === state.selectedEventId) as AIEvent) ?? null;
}
