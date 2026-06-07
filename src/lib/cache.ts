import { get, set } from 'idb-keyval'

interface Cached<T> {
  ts: number
  data: T
}

/**
 * Read-through IndexedDB cache. Returns cached data if younger than ttlMs,
 * otherwise fetches, stores, and returns fresh data. idb failures are
 * non-fatal (we just fall through to the network).
 */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const hit = await get<Cached<T>>(key)
    if (hit && Date.now() - hit.ts < ttlMs) return hit.data
  } catch {
    // ignore idb read errors
  }
  const data = await fetcher()
  try {
    await set(key, { ts: Date.now(), data } satisfies Cached<T>)
  } catch {
    // ignore idb write errors
  }
  return data
}
