// Hand-written types for the subset of the tarkov.dev schema we use (BUILD_PLAN.md §5).

export interface ItemIndexEntry {
  id: string
  name: string
  shortName: string
  normalizedName: string
  iconLink: string | null
  avg24hPrice: number | null
  lastLowPrice: number | null
  basePrice: number
  types: string[]
}

export interface VendorPrice {
  vendor: { name: string; normalizedName: string }
  priceRUB: number
}

export interface TaskObjective {
  __typename: string
  item?: { id: string; name: string } | null
  items?: { id: string; name: string }[] | null
  count?: number | null
  foundInRaid?: boolean | null
}

export interface UsedInTask {
  id: string
  name: string
  wikiLink: string | null
  trader: { name: string } | null
  minPlayerLevel: number | null
  kappaRequired: boolean | null
  objectives: TaskObjective[]
}

export interface ItemDetail {
  id: string
  name: string
  shortName: string
  wikiLink: string | null
  iconLink: string | null
  image512pxLink: string | null
  basePrice: number
  avg24hPrice: number | null
  lastLowPrice: number | null
  high24hPrice: number | null
  changeLast48hPercent: number | null
  fleaMarketFee: number | null
  sellFor: VendorPrice[]
  usedInTasks: UsedInTask[]
}

export interface HideoutStationLevel {
  level: number
  itemRequirements: { item: { id: string; name: string } | null; count: number }[]
}

export interface HideoutStation {
  id: string
  name: string
  normalizedName: string
  levels: HideoutStationLevel[]
}

// Derived (client-side) reverse-index entry: "this item is needed by this module level".
export interface HideoutUse {
  stationId: string
  station: string
  level: number
  count: number
  levelId: string // `${stationId}-${level}` — stable local key
}

export interface TaskSummary {
  id: string
  name: string
  wikiLink: string | null
  minPlayerLevel: number | null
  kappaRequired: boolean | null
  trader: { name: string } | null
  taskRequirements: { task: { id: string; name: string } | null }[]
}

export interface Ammo {
  item: {
    id: string
    name: string
    shortName: string
    iconLink: string | null
    avg24hPrice: number | null
  }
  caliber: string | null
  ammoType: string | null
  damage: number
  armorDamage: number
  penetrationPower: number
  fragmentationChance: number
  projectileCount: number | null
  accuracyModifier: number | null
  recoilModifier: number | null
  initialSpeed: number | null
  tracer: boolean
}
