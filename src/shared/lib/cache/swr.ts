import { logger } from "../../utils/logger";

type CacheEntry<T> = {
  data: T;
  validUntil: number;
};

type SWROptions = {
  ttlMs?: number; // How long until data is considered stale
  maxEntries?: number; // Max number of entries to keep in cache
};

export class SWRCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private inFlight = new Map<K, Promise<V>>();
  private readonly options: Required<SWROptions>;

  constructor(options: SWROptions = {}) {
    this.options = {
      ttlMs: options.ttlMs ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: options.maxEntries ?? 1000,
    };
  }

  async get(key: K, fetchFn: () => Promise<V>): Promise<V> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // If no cached data, handle fetch with deduplication
    if (!entry) {
      return this.dedupedFetch(key, fetchFn);
    }

    // Check if stale
    const isStale = now > entry.validUntil;

    // If stale, trigger background revalidation and return stale data
    if (isStale) {
      this.dedupedFetch(key, fetchFn).catch((error) => {
        logger({
          service: "server",
          level: "error",
          message: `Failed to revalidate cache for key ${key}`,
          error,
        });
        // Silence background revalidation errors
      });
    }

    return entry.data;
  }

  private async dedupedFetch(key: K, fetchFn: () => Promise<V>): Promise<V> {
    // Check for in-flight request
    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      return inFlight;
    }

    // Create new request
    const fetchPromise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  private set(key: K, data: V): void {
    if (this.cache.size >= this.options.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey as K);
    }

    this.cache.set(key, {
      data,
      validUntil: Date.now() + this.options.ttlMs,
    });
  }
}

export function createSWRCache<K, V>(options?: SWROptions) {
  return new SWRCache<K, V>(options);
}
