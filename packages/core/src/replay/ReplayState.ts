export type ReplayStatus = "idle" | "playing" | "paused" | "ended";

export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;

export interface ReplayState {
  readonly status: ReplayStatus;
  readonly speed: ReplaySpeed;
  /** Elapsed time from session start, in ms */
  readonly currentTime: number;
  /** Total session duration in ms */
  readonly duration: number;
  /** Index of the next event to be emitted */
  readonly eventIndex: number;
}
