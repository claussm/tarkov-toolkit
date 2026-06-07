import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { AMMO_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'
import type { Ammo } from '../api/types'

interface AmmoResponse {
  ammo: Ammo[]
}

const TEN_MIN = 10 * 60 * 1000

export function useAmmo() {
  return useQuery({
    queryKey: ['ammo'],
    queryFn: () =>
      cachedFetch('tt:ammo:v1', TEN_MIN, () =>
        gqlClient.request<AmmoResponse>(AMMO_QUERY).then((r) => r.ammo),
      ),
    staleTime: TEN_MIN,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
