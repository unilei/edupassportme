import type { RawListing, SyncResult, ProviderConfig } from "./types";

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract fetchListings(options?: {
    page?: number;
    limit?: number;
    since?: Date;
  }): Promise<RawListing[]>;

  get slug(): string {
    return this.config.slug;
  }

  get name(): string {
    return this.config.name;
  }

  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
    retries = 3
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            "User-Agent": "EDU Passport/1.0",
            ...options?.headers,
          },
        });
        if (res.ok) return res;
        if (res.status === 429 && i < retries - 1) {
          const wait = Math.pow(2, i) * 1000;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
    throw new Error("Exhausted retries");
  }
}

export type { RawListing, SyncResult, ProviderConfig };
