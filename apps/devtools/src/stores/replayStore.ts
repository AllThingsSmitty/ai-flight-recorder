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
  _unsubs: Array<() => void>;

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
  _unsubs: [],

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

    set({
      engine,
      replayState: engine.getState(),
      visibleEventIds: new Set(),
      isReplayMode: true,
      _unsubs: [unsubState, unsubEvent, unsubEnded],
    });
  },

  exitReplay: () => {
    const { engine, _unsubs } = get();
    engine?.reset();
    _unsubs.forEach((fn) => fn());
    set({ engine: null, replayState: null, visibleEventIds: new Set(), isReplayMode: false, _unsubs: [] });
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
