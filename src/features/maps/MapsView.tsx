import { useState } from 'react'
import { MAP_CONFIGS } from '../../maps/mapConfigs'
import { useMapMarkers } from '../../data/useMapMarkers'
import { MapView } from './MapView'

export function MapsView() {
  const [selected, setSelected] = useState(MAP_CONFIGS[0].key)
  const { data, isLoading, isError } = useMapMarkers()

  const config = MAP_CONFIGS.find((m) => m.key === selected) ?? MAP_CONFIGS[0]
  const markers = data?.find((m) => m.normalizedName === config.key)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1 border-b border-neutral-800 p-2">
        {MAP_CONFIGS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className={`rounded px-2.5 py-1 text-sm ${
              selected === m.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {isError ? (
          <div className="p-4 text-red-400">Couldn’t load map data.</div>
        ) : isLoading ? (
          <div className="p-4 text-neutral-500">Loading maps…</div>
        ) : (
          <MapView key={config.key} config={config} markers={markers} />
        )}
        <div className="pointer-events-none absolute bottom-1 right-2 z-[500] text-[10px] text-neutral-500">
          Map art © Shebuka / the-hideout (CC BY-NC-SA)
        </div>
      </div>
    </div>
  )
}
