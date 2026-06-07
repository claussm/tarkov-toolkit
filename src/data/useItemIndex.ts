import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { gqlClient } from '../api/client'
import { ITEM_INDEX_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'
import type { ItemIndexEntry } from '../api/types'

interface ItemIndexResponse {
  items: ItemIndexEntry[]
}

const TEN_MIN = 10 * 60 * 1000

export function useItemIndex() {
  const query = useQuery({
    queryKey: ['itemIndex'],
    queryFn: () =>
      cachedFetch('tt:itemIndex:v1', TEN_MIN, () =>
        gqlClient.request<ItemIndexResponse>(ITEM_INDEX_QUERY).then((r) => r.items),
      ),
    staleTime: TEN_MIN,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const items = query.data
  const fuse = useMemo(() => {
    if (!items) return null
    return new Fuse(items, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'shortName', weight: 0.3 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    })
  }, [items])

  return { ...query, items, fuse }
}
