"use client";

import { create } from "zustand";
import type { ReplaySpeed, ReplayState, Session } from "@ai-flight-recorder/sdk";
import { ReplayEngine } from "@ai-flight-recorder/sdk";

interface ReplayStore {
  engine: ReplayEngine | null;
  replayState: ReplayState | null;
  /** Event IDs that have been "emitted" during replay */
  visibleEventIds: Set<string>;
  isReplayMode: boolean;

  initReplay: (session: Session) => void;
  exitReplay: () => void;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  setSpeed: (speed: ReplaySpeed) => void;
  reset: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  engine: null,
  replayState: null,
  visibleEventIds: new Set(),
  isReplayMode: false,

  initReplay: (session) => {
    const { engine: prev } = get();
    prev?.reset();

    const engine = new ReplayEngine(session);

    const unsubState = engine.on("stateChange", (state) => {
      set({ replayState: state });
    });

    const unsubEvent = engine.on("event", (event) => {
      set((s) => ({
        visibleEventIds: new Set([...s.visibleEventIds, event.id]),
      }));
    });

    const unsubEnded = engine.on("ended", () => {
      set((s) => ({
        visibleEventIds: new Set(session.events.map((e) => e.id)),
        replayState: s.replayState
          ? { ...s.replayState, status: "ended" }
          : null,
      }));
    });

    // Store cleanup in the engine instance as a side channel
    (engine as unknown as { _cleanup?: () => void })._cleanup = () => {
      unsubState();
      unsubEvent();
      unsubEnded();
    };

    set({
      engine,
      replayState: engine.getState(),
      visibleEventIds: new Set(),
      isReplayMode: true,
    });
  },

  exitReplay: () => {
    const { engine } = get();
    if (engine) {
      engine.reset();
      (engine as unknown as { _cleanup?: () => void })._cleanup?.();
    }
    set({ engine: null, replayState: null, visibleEventIds: new Set(), isReplayMode: false });
  },

  play: () => get().engine?.play(),
  pause: () => get().engine?.pause(),
  seek: (timeMs) => get().engine?.seek(timeMs),
  setSpeed: (speed) => get().engine?.setSpeed(speed),
  reset: () => {
    get().engine?.reset();
    set({ visibleEventIds: new Set() });
  },
}));
