import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpTransport } from "./HttpTransport";
import type { Session } from "@ai-flight-recorder/core";

function makeSession(): Session {
  return {
    id: "s1",
    status: "ended",
    startedAt: 1000,
    endedAt: 2000,
    events: [
      { id: "e1", sessionId: "s1", type: "session-started", timestamp: 1000 },
      { id: "e2", sessionId: "s1", type: "session-ended", timestamp: 2000, durationMs: 1000, totalEvents: 2 },
    ],
  };
}

function mockFetch(ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpTransport", () => {
  it("POSTs to the configured URL with JSON content-type", async () => {
    const fetch = mockFetch();
    vi.stubGlobal("fetch", fetch);
    const transport = new HttpTransport({ url: "https://example.com/sessions" });
    await transport.save(makeSession());
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/sessions");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.method).toBe("POST");
  });

  it("includes Authorization header when apiKey is provided", async () => {
    const fetch = mockFetch();
    vi.stubGlobal("fetch", fetch);
    const transport = new HttpTransport({ url: "https://example.com/sessions", apiKey: "token-123" });
    await transport.save(makeSession());
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer token-123");
  });

  it("omits Authorization header when no apiKey", async () => {
    const fetch = mockFetch();
    vi.stubGlobal("fetch", fetch);
    const transport = new HttpTransport({ url: "https://example.com/sessions" });
    await transport.save(makeSession());
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 500));
    const transport = new HttpTransport({ url: "https://example.com/sessions" });
    await expect(transport.save(makeSession())).rejects.toThrow("500");
  });
});
