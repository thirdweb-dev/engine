import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type SWRCache, createSWRCache } from "../lib/cache/swr";

describe("SWRCache", () => {
  let cache: SWRCache<string, number>;
  let fetchCount: number;
  let now: number;

  // Use vi.setSystemTime() instead of real timeouts
  beforeEach(() => {
    now = Date.now();
    vi.setSystemTime(now);
    cache = createSWRCache<string, number>({ ttlMs: 100 }); // 100ms TTL for tests
    fetchCount = 0;
  });

  const createFetcher = () => {
    return async () => {
      fetchCount++;
      return fetchCount;
    };
  };

  test("should fetch and cache new values", async () => {
    const fetcher = createFetcher();
    const value = await cache.get("key1", fetcher);

    expect(value).toBe(1);
    expect(fetchCount).toBe(1);

    // Second get should use cache
    const cachedValue = await cache.get("key1", fetcher);
    expect(cachedValue).toBe(1);
    expect(fetchCount).toBe(1);
  });

  test("should handle multiple concurrent requests", async () => {
    const fetcher = createFetcher();
    const results = await Promise.all([
      cache.get("key1", fetcher),
      cache.get("key1", fetcher),
      cache.get("key1", fetcher),
    ]);

    expect(results).toEqual([1, 1, 1]);
    expect(fetchCount).toBe(1);
  });

  test("should handle multiple concurrent failed requests", async () => {
    let attempts = 0;
    const errorFetcher = async () => {
      attempts++;
      throw new Error(`Attempt ${attempts} failed`);
    };

    const promises = Promise.all([
      expect(cache.get("key1", errorFetcher)).rejects.toThrow(
        "Attempt 1 failed",
      ),
      expect(cache.get("key1", errorFetcher)).rejects.toThrow(
        "Attempt 1 failed",
      ),
      expect(cache.get("key1", errorFetcher)).rejects.toThrow(
        "Attempt 1 failed",
      ),
    ]);

    await promises;
    expect(attempts).toBe(1);
  });

  test("should revalidate stale data in background", async () => {
    const fetcher = createFetcher();

    // Initial fetch
    const initial = await cache.get("key1", fetcher);
    expect(initial).toBe(1);
    expect(fetchCount).toBe(1);

    // Move time forward past TTL
    vi.setSystemTime(now + 200);

    // Should get stale data immediately while revalidating
    const stalePromise = cache.get("key1", fetcher);

    // Value should be returned immediately (stale)
    const stale = await stalePromise;
    expect(stale).toBe(1);

    // Let revalidation complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should have fresh data now
    const fresh = await cache.get("key1", fetcher);
    expect(fresh).toBe(2);
    expect(fetchCount).toBe(2);
  });

  test("should respect max entries", async () => {
    const cache = createSWRCache<string, number>({ maxEntries: 2 });
    const fetcher = createFetcher();

    await cache.get("key1", fetcher);
    await cache.get("key2", fetcher);
    await cache.get("key3", fetcher);

    // Try to get first key (should trigger new fetch)
    fetchCount = 0;
    await cache.get("key1", fetcher);
    expect(fetchCount).toBe(1);
  });

  test("should handle errors during background revalidation", async () => {
    const fetcher = createFetcher();
    const errorFetcher = async () => {
      throw new Error("Revalidation failed");
    };

    // Initial successful fetch
    const initial = await cache.get("key1", fetcher);
    expect(initial).toBe(1);

    // Move time forward past TTL
    vi.setSystemTime(now + 200);

    // Should return stale data even if revalidation fails
    const stale = await cache.get("key1", errorFetcher);
    expect(stale).toBe(1);

    // Let background revalidation attempt complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should still have stale data after failed revalidation
    const stillStale = await cache.get("key1", errorFetcher);
    expect(stillStale).toBe(1);
  });

  test("should handle rapid successive requests on stale data", async () => {
    const fetcher = createFetcher();

    // Initial fetch
    await cache.get("key1", fetcher);

    // Move time forward past TTL
    vi.setSystemTime(now + 200);

    // Create 10 rapid requests
    const promises = Array.from({ length: 10 }, () =>
      cache.get("key1", fetcher),
    );
    const results = await Promise.all(promises);

    // All should have same value
    expect(results.every((r) => r === 1)).toBe(true);
    // Should only trigger one background revalidation
    expect(fetchCount).toBe(2);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
