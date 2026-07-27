import { Session, Transport, serializeSession } from "@ai-flight-recorder/core";

export interface HttpTransportOptions {
  url: string;
  apiKey?: string;
  timeout?: number;
}

export class HttpTransport implements Transport {
  private _url: string;
  private _apiKey?: string;
  private _timeout: number;

  constructor(options: HttpTransportOptions) {
    this._url = options.url;
    this._apiKey = options.apiKey;
    this._timeout = options.timeout ?? 30_000;
  }

  async save(session: Session): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeout);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this._apiKey) {
      headers["Authorization"] = `Bearer ${this._apiKey}`;
    }

    try {
      const response = await fetch(this._url, {
        method: "POST",
        headers,
        body: serializeSession(session),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `[flight-recorder] HTTP ${response.status} ${response.statusText} from ${this._url}`
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
