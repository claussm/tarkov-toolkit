import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { ITEM_DETAIL_QUERY } from '../api/queries'
import type { ItemDetail } from '../api/types'

interface ItemDetailResponse {
  item: ItemDetail | null
}

export function useItemDetail(id: string | null) {
  return useQuery({
    queryKey: ['itemDetail', id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      gqlClient
        .request<ItemDetailResponse>(ITEM_DETAIL_QUERY, { id: id as string })
        .then((r) => r.item),
  })
}
