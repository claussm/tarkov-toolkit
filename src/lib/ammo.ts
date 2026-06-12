// Friendly caliber labels for the tarkov.dev `caliber` enum-like strings.
const CALIBER_LABELS: Record<string, string> = {
  Caliber9x18PM: '9x18mm PM',
  Caliber9x19PARA: '9x19mm Para',
  Caliber9x21: '9x21mm',
  Caliber46x30: '4.6x30mm',
  Caliber57x28: '5.7x28mm',
  Caliber762x25TT: '7.62x25mm TT',
  Caliber1143x23ACP: '.45 ACP',
  Caliber9x33R: '.357 Magnum',
  Caliber545x39: '5.45x39mm',
  Caliber556x45NATO: '5.56x45mm',
  Caliber762x39: '7.62x39mm',
  Caliber762x51: '7.62x51mm',
  Caliber762x54R: '7.62x54mmR',
  Caliber762x35: '.300 Blackout',
  Caliber366TKM: '.366 TKM',
  Caliber9x39: '9x39mm',
  Caliber762x38nagant: '7.62x38mmR Nagant',
  Caliber12g: '12 Gauge',
  Caliber20g: '20 Gauge',
  Caliber23x75: '23x75mm',
  Caliber40x46: '40x46mm',
  Caliber40mmRU: '40mm VOG',
  Caliber127x55: '12.7x55mm',
  Caliber86x70: '.338 Lapua',
  Caliber68x51: '6.8x51mm',
  Caliber127x108: '12.7x108mm',
  Caliber30x29: '30x29mm',
}

export function caliberLabel(c: string | null): string {
  if (!c) return 'Other'
  return CALIBER_LABELS[c] ?? c.replace(/^Caliber/, '')
}

export interface PenTier {
  label: string
  text: string
  bg: string
}

// Penetration tier coloring (BUILD_PLAN.md §8).
export function penTier(pen: number): PenTier {
  if (pen >= 50) return { label: 'extreme', text: 'text-teal-200', bg: 'bg-teal-900/50' }
  if (pen >= 40) return { label: 'very high', text: 'text-emerald-200', bg: 'bg-emerald-900/50' }
  if (pen >= 30) return { label: 'high', text: 'text-yellow-200', bg: 'bg-yellow-900/40' }
  if (pen >= 20) return { label: 'medium', text: 'text-orange-200', bg: 'bg-orange-900/40' }
  if (pen >= 10) return { label: 'low', text: 'text-red-200', bg: 'bg-red-900/40' }
  return { label: 'very low', text: 'text-neutral-400', bg: 'bg-neutral-800/60' }
}

// The six EFT body-armor protection classes.
export const ARMOR_CLASSES = [1, 2, 3, 4, 5, 6] as const

// First-shot penetration chance (0–100) of a round against a *fresh*
// (full-durability) armor of the given class. EFT's penetration curve crosses
// ~50% around Pen = class×10 and spans ~5%→95% across the ±10 band either side
// (community-reverse-engineered rule of thumb; see eft-ammo / the Ballistics wiki).
// Modelled as a logistic centred at class×10 with scale tuned so ±10 ≈ 5/95%.
export function penChance(pen: number, armorClass: number): number {
  const x = (pen - armorClass * 10) / 3.4
  return 100 / (1 + Math.exp(-x))
}

export interface PenCell {
  text: string
  bg: string
}

// Cell coloring for a per-class penetration chance: green pens / yellow marginal
// / red won't. Bands are narrow because the real pen curve is steep — a round
// mostly either defeats a class or it doesn't.
export function penCellTier(chance: number): PenCell {
  if (chance >= 65) return { text: 'text-emerald-200', bg: 'bg-emerald-900/60' }
  if (chance >= 30) return { text: 'text-yellow-200', bg: 'bg-yellow-900/40' }
  return { text: 'text-red-400/70', bg: 'bg-red-950/40' }
}
