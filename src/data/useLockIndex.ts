import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { LOCKS_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'

export interface LockEntry {
  map: string
  lockType: string | null
  needsPower: boolean | null
}

interface LocksResponse {
  maps: {
    name: string
    locks: { lockType: string | null; needsPower: boolean | null; key: { id: string } | null }[]
  }[]
}

const ONE_DAY = 24 * 60 * 60 * 1000

// Reverse index: key item id -> the locks it opens (across all maps).
// Only fetched when `enabled` (i.e. the looked-up item is a key).
export function useLockIndex(enabled: boolean) {
  return useQuery<Map<string, LockEntry[]>>({
    queryKey: ['lockIndex'],
    enabled,
    queryFn: async () => {
      const maps = await cachedFetch('tt:locks:v1', ONE_DAY, () =>
        gqlClient.request<LocksResponse>(LOCKS_QUERY).then((r) => r.maps),
      )
      const byKey = new Map<string, LockEntry[]>()
      for (const m of maps) {
        for (const lk of m.locks) {
          if (!lk.key) continue
          const arr = byKey.get(lk.key.id) ?? []
          arr.push({ map: m.name, lockType: lk.lockType, needsPower: lk.needsPower })
          byKey.set(lk.key.id, arr)
        }
      }
      return byKey
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}
