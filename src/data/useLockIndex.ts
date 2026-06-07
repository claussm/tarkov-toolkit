import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { LOCKS_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'

export interface LockMapCount {
  map: string
  count: number
}

interface LocksResponse {
  maps: {
    name: string
    locks: { position: { x: number; y: number; z: number } | null; key: { id: string } | null }[]
  }[]
}

const ONE_DAY = 24 * 60 * 60 * 1000

// The API exposes physically-identical maps under two names (Factory/Night Factory,
// Ground Zero / Ground Zero 21+ / Tutorial) with byte-identical lock positions, which
// double-counts locks. Collapse those to a single canonical map before counting.
function canonicalMap(name: string): string {
  if (name === 'Night Factory') return 'Factory'
  if (name.startsWith('Ground Zero')) return 'Ground Zero'
  return name
}

function posKey(p: { x: number; y: number; z: number } | null, fallback: number): string {
  if (!p) return `null-${fallback}`
  const r = (n: number) => Math.round(n * 10) / 10
  return `${r(p.x)},${r(p.y)},${r(p.z)}`
}

/**
 * Reverse index: key item id -> the distinct locks it opens, grouped by canonical map.
 * Locks are deduped by (canonical map, rounded position) so map-variant duplicates and
 * any repeated coordinates don't inflate the count. Only fetched when `enabled`.
 */
export function useLockIndex(enabled: boolean) {
  return useQuery<Map<string, LockMapCount[]>>({
    queryKey: ['lockIndex'],
    enabled,
    queryFn: async () => {
      const maps = await cachedFetch('tt:locks:v2', ONE_DAY, () =>
        gqlClient.request<LocksResponse>(LOCKS_QUERY).then((r) => r.maps),
      )

      // keyId -> canonicalMap -> set of distinct lock positions
      const byKey = new Map<string, Map<string, Set<string>>>()
      let nullCounter = 0
      for (const m of maps) {
        const cmap = canonicalMap(m.name)
        for (const lk of m.locks) {
          if (!lk.key) continue
          let byMap = byKey.get(lk.key.id)
          if (!byMap) {
            byMap = new Map()
            byKey.set(lk.key.id, byMap)
          }
          let set = byMap.get(cmap)
          if (!set) {
            set = new Set()
            byMap.set(cmap, set)
          }
          set.add(posKey(lk.position, nullCounter++))
        }
      }

      const result = new Map<string, LockMapCount[]>()
      for (const [keyId, byMap] of byKey) {
        const arr = [...byMap.entries()]
          .map(([map, set]) => ({ map, count: set.size }))
          .sort((a, b) => b.count - a.count || a.map.localeCompare(b.map))
        result.set(keyId, arr)
      }
      return result
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}
