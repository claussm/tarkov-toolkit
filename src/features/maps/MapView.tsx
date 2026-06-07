import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getBounds, getCRS, getScaledBounds, pos } from '../../maps/crs'
import type { MapConfig } from '../../maps/mapConfigs'
import type { MapMarkers } from '../../api/types'

function extractColor(faction: string | null): string {
  if (faction === 'scav') return '#fb923c'
  if (faction === 'shared') return '#fbbf24'
  return '#4ade80' // pmc / default
}

function spawnColor(sides: string[] | null, categories: string[] | null): string {
  const c = (categories ?? []).map((s) => s.toLowerCase())
  const s = (sides ?? []).map((x) => x.toLowerCase())
  if (c.includes('boss')) return '#c084fc'
  if (s.includes('scav') || c.includes('scav')) return '#fb923c'
  return '#f87171' // pmc / player
}

export function MapView({ config, markers }: { config: MapConfig; markers: MapMarkers | undefined }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const map = L.map(el, {
      crs: getCRS(config),
      minZoom: config.minZoom,
      maxZoom: Math.max(7, config.maxZoom),
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.5,
    })

    const bounds = getBounds(config.bounds)
    L.imageOverlay(config.svgPath, bounds).addTo(map)
    map.setMaxBounds(getScaledBounds(config.bounds, 1.5))
    map.fitBounds(bounds)

    const extractLayer = L.layerGroup()
    const transitLayer = L.layerGroup()
    const spawnLayer = L.layerGroup()

    for (const ex of markers?.extracts ?? []) {
      const color = extractColor(ex.faction)
      L.circleMarker(pos(ex.position), {
        radius: 6,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.5,
      })
        .bindTooltip(ex.name ?? 'Extract', { direction: 'top' })
        .addTo(extractLayer)
    }

    for (const tr of markers?.transits ?? []) {
      const label = (tr.description ?? 'Transit').replace(/^Transit to /i, '→ ')
      L.circleMarker(pos(tr.position), {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#22d3ee',
        fillOpacity: 0.9,
      })
        .bindTooltip(label, {
          permanent: true,
          direction: 'right',
          className: 'transit-tooltip',
          offset: [6, 0],
        })
        .addTo(transitLayer)
    }

    for (const sp of markers?.spawns ?? []) {
      const color = spawnColor(sp.sides, sp.categories)
      const label =
        [...new Set([...(sp.categories ?? []), ...(sp.sides ?? [])])].join(' / ') || 'Spawn'
      L.circleMarker(pos(sp.position), {
        radius: 4,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.6,
      })
        .bindTooltip(label, { direction: 'top' })
        .addTo(spawnLayer)
    }

    extractLayer.addTo(map)
    transitLayer.addTo(map)
    // Spawns are off by default — toggle them on in the layer control.
    L.control
      .layers(
        undefined,
        { Transits: transitLayer, Extracts: extractLayer, Spawns: spawnLayer },
        { collapsed: false },
      )
      .addTo(map)

    const t = window.setTimeout(() => {
      map.invalidateSize()
      map.fitBounds(bounds)
    }, 60)

    return () => {
      window.clearTimeout(t)
      map.remove()
    }
  }, [config, markers])

  return <div ref={ref} className="absolute inset-0 bg-neutral-900" />
}
