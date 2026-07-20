import type { Session } from "@flight-recorder/sdk";

// Module-level singleton — persists across requests within the same server process.
// In production, replace this with a database or distributed cache.
export const sessionStore = {
  latest: null as Session | null,
};
