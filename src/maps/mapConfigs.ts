// Per-map render config. Transform/rotation/bounds values are lifted from tarkov.dev's
// src/data/maps.json (the "interactive" variant of each map). The SVG assets are
// self-hosted under public/maps/ (svgPath is an app-relative path) — CC BY-NC-SA 4.0,
// author: Shebuka / the-hideout. `key` matches both the maps.json key and the
// tarkov.dev GraphQL `normalizedName`.

export interface MapConfig {
  key: string
  name: string
  svgPath: string
  bounds: number[][]
  coordinateRotation: number
  transform: number[]
  minZoom: number
  maxZoom: number
}

export const MAP_CONFIGS: MapConfig[] = [
  {
    key: 'customs',
    name: 'Customs',
    svgPath: '/maps/Customs.svg',
    bounds: [[698, -307], [-372, 237]],
    coordinateRotation: 180,
    transform: [0.239, 168.65, 0.239, 136.35],
    minZoom: 2,
    maxZoom: 6,
  },
  {
    key: 'factory',
    name: 'Factory',
    svgPath: '/maps/Factory.svg',
    bounds: [[77, -64.5], [-65.5, 67.4]],
    coordinateRotation: 90,
    transform: [1.629, 119.9, 1.629, 139.3],
    minZoom: 1,
    maxZoom: 6,
  },
  {
    key: 'woods',
    name: 'Woods',
    svgPath: '/maps/Woods.svg',
    bounds: [[646, -914], [-761, 442]],
    coordinateRotation: 180,
    transform: [0.1855, 112.95, 0.1855, 167.85],
    minZoom: 2,
    maxZoom: 6,
  },
  {
    key: 'interchange',
    name: 'Interchange',
    svgPath: '/maps/Interchange.svg',
    bounds: [[598, -442], [-433, 426]],
    coordinateRotation: 180,
    transform: [0.265, 150.6, 0.265, 134.6],
    minZoom: 1,
    maxZoom: 6,
  },
  {
    key: 'reserve',
    name: 'Reserve',
    svgPath: '/maps/Reserve.svg',
    bounds: [[289, -293], [-303, 244]],
    coordinateRotation: 180,
    transform: [0.395, 122.0, 0.395, 137.65],
    minZoom: 2,
    maxZoom: 6,
  },
  {
    key: 'shoreline',
    name: 'Shoreline',
    svgPath: '/maps/Shoreline.svg',
    bounds: [[504, -415], [-1056, 618]],
    coordinateRotation: 180,
    transform: [0.16, 83.2, 0.16, 111.1],
    minZoom: 2,
    maxZoom: 6,
  },
  {
    key: 'lighthouse',
    name: 'Lighthouse',
    svgPath: '/maps/Lighthouse.svg',
    bounds: [[515, -998], [-545, 725]],
    coordinateRotation: 180,
    transform: [0.2, 0, 0.2, 0],
    minZoom: 1,
    maxZoom: 6,
  },
  {
    key: 'streets-of-tarkov',
    name: 'Streets of Tarkov',
    svgPath: '/maps/StreetsOfTarkov.svg',
    bounds: [[323, -295], [-280, 532]],
    coordinateRotation: 180,
    transform: [0.38, 0, 0.38, 0],
    minZoom: 1,
    maxZoom: 5,
  },
  {
    key: 'ground-zero',
    name: 'Ground Zero',
    svgPath: '/maps/GroundZero.svg',
    bounds: [[249, -124], [-99, 364]],
    coordinateRotation: 180,
    transform: [0.524, 167.3, 0.524, 65.1],
    minZoom: 1,
    maxZoom: 6,
  },
  {
    key: 'terminal',
    name: 'Terminal',
    svgPath: '/maps/Terminal.svg',
    bounds: [[463, -580], [-433, 475]],
    coordinateRotation: 180,
    transform: [0.2, 0, 0.2, 0],
    minZoom: 2,
    maxZoom: 6,
  },
]
