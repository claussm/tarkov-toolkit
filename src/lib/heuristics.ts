import type { ItemDetail, UsedInTask } from '../api/types'
import { formatShort } from './format'

export type VerdictTone = 'keep' | 'sell' | 'vendor' | 'neutral'

export interface Verdict {
  label: string
  tone: VerdictTone
}

// Tunable thresholds (BUILD_PLAN.md §7).
export const KEEP_FLEA_THRESHOLD = 30_000
export const FLEA_OVER_VENDOR_RATIO = 1.3

export function fleaValue(detail: ItemDetail): number | null {
  return detail.avg24hPrice ?? detail.lastLowPrice ?? null
}

export function bestVendorSell(detail: ItemDetail): { name: string; price: number } | null {
  let best: { name: string; price: number } | null = null
  for (const s of detail.sellFor) {
    if (s.vendor.normalizedName === 'flea-market') continue
    if (!best || s.priceRUB > best.price) best = { name: s.vendor.name, price: s.priceRUB }
  }
  return best
}

export interface QuestItemReq {
  count: number | null
  foundInRaid: boolean
}

/** The item-handover requirement (count + found-in-raid flag) for a given item in a
 *  single quest, or null if the quest doesn't hand over this item. */
export function questItemReq(task: UsedInTask, itemId: string): QuestItemReq | null {
  for (const o of task.objectives ?? []) {
    if (o.__typename !== 'TaskObjectiveItem') continue
    const matches = o.item?.id === itemId || (o.items?.some((i) => i.id === itemId) ?? false)
    if (!matches) continue
    return { count: o.count ?? null, foundInRaid: o.foundInRaid ?? false }
  }
  return null
}

/** Count of a given item required by a single quest's item-handover objectives. */
export function questItemCount(task: UsedInTask, itemId: string): number | null {
  return questItemReq(task, itemId)?.count ?? null
}

export function keepSellVerdict(opts: {
  detail: ItemDetail
  stillNeededQuests: number
  stillNeededHideout: number
}): Verdict {
  const { detail, stillNeededQuests, stillNeededHideout } = opts

  if (stillNeededQuests > 0 || stillNeededHideout > 0) {
    const parts: string[] = []
    if (stillNeededQuests > 0) parts.push(`${stillNeededQuests} quest${stillNeededQuests > 1 ? 's' : ''}`)
    if (stillNeededHideout > 0) parts.push(`${stillNeededHideout} hideout module${stillNeededHideout > 1 ? 's' : ''}`)
    return { label: `KEEP — still needed for ${parts.join(' + ')}`, tone: 'keep' }
  }

  const flea = fleaValue(detail)
  const vendor = bestVendorSell(detail)

  if (flea != null && flea >= KEEP_FLEA_THRESHOLD) {
    return { label: `KEEP / SELL — high flea value (${formatShort(flea)})`, tone: 'keep' }
  }
  if (flea != null && (!vendor || flea > vendor.price * FLEA_OVER_VENDOR_RATIO)) {
    return { label: `SELL ON FLEA (~${formatShort(flea)})`, tone: 'sell' }
  }
  if (vendor) {
    return { label: `SELL TO ${vendor.name} (${formatShort(vendor.price)})`, tone: 'vendor' }
  }
  return { label: 'No quest / hideout use', tone: 'neutral' }
}
