import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { MAP_MARKERS_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'
import type { MapMarkers } from '../api/types'

interface MapsResponse {
  maps: MapMarkers[]
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function useMapMarkers() {
  return useQuery({
    queryKey: ['mapMarkers'],
    queryFn: () =>
      cachedFetch('tt:mapMarkers:v1', ONE_DAY, () =>
        gqlClient.request<MapsResponse>(MAP_MARKERS_QUERY).then((r) => r.maps),
      ),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}
