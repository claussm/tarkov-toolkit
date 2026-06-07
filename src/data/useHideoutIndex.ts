import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { HIDEOUT_REQUIREMENTS_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'
import type { HideoutStation, HideoutUse } from '../api/types'

interface HideoutResponse {
  hideoutStations: HideoutStation[]
}

export interface HideoutIndex {
  stations: HideoutStation[]
  byItemId: Map<string, HideoutUse[]>
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function useHideoutIndex() {
  return useQuery<HideoutIndex>({
    queryKey: ['hideoutIndex'],
    queryFn: async () => {
      const stations = await cachedFetch('tt:hideout:v1', ONE_DAY, () =>
        gqlClient.request<HideoutResponse>(HIDEOUT_REQUIREMENTS_QUERY).then((r) => r.hideoutStations),
      )
      // There is no item->hideout backlink in the schema, so invert it here.
      const byItemId = new Map<string, HideoutUse[]>()
      for (const station of stations) {
        for (const lvl of station.levels) {
          const levelId = `${station.id}-${lvl.level}`
          for (const req of lvl.itemRequirements) {
            if (!req.item) continue
            const arr = byItemId.get(req.item.id) ?? []
            arr.push({
              stationId: station.id,
              station: station.name,
              level: lvl.level,
              count: req.count,
              levelId,
            })
            byItemId.set(req.item.id, arr)
          }
        }
      }
      return { stations, byItemId }
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}
