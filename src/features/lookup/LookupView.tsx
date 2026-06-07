import { useMemo, useState } from 'react'
import { useItemIndex } from '../../data/useItemIndex'
import { ItemCard } from './ItemCard'
import type { ItemIndexEntry } from '../../api/types'

export function LookupView() {
  const { items, fuse, isLoading, isError, refetch } = useItemIndex()
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const results = useMemo<ItemIndexEntry[]>(() => {
    if (!fuse || q.trim().length < 2) return []
    return fuse.search(q.trim(), { limit: 8 }).map((r) => r.item)
  }, [fuse, q])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="relative">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            isLoading
              ? 'Loading item database…'
              : `Search ${items?.length ?? ''} items (e.g. ledx, gpu, bolts)…`
          }
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-lg outline-none focus:border-neutral-500"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
            {results.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => {
                    setSelectedId(it.id)
                    setQ('')
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-800"
                >
                  {it.iconLink && (
                    <img src={it.iconLink} alt="" className="h-8 w-8 rounded object-contain" />
                  )}
                  <span className="flex-1">
                    <span className="block text-sm">{it.name}</span>
                    <span className="block text-xs text-neutral-500">{it.shortName}</span>
                  </span>
                  {it.avg24hPrice != null && (
                    <span className="text-xs text-neutral-400">₽{it.avg24hPrice.toLocaleString()}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isError && (
        <p className="text-sm text-red-400">
          Couldn’t reach the tarkov.dev API.{' '}
          <button onClick={() => refetch()} className="underline">
            Retry
          </button>
        </p>
      )}

      {selectedId ? (
        <ItemCard id={selectedId} />
      ) : (
        <p className="text-center text-sm text-neutral-500">
          Type an item name to see quests, hideout needs, flea value, and a keep/sell call.
        </p>
      )}
    </div>
  )
}
