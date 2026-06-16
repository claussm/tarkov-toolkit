import type { ReactNode } from 'react'

const tones: Record<string, string> = {
  keep: 'bg-emerald-900/60 text-emerald-200 ring-emerald-700/50',
  sell: 'bg-amber-900/60 text-amber-200 ring-amber-700/50',
  vendor: 'bg-sky-900/60 text-sky-200 ring-sky-700/50',
  neutral: 'bg-neutral-800 text-neutral-300 ring-neutral-700',
  quest: 'bg-purple-900/60 text-purple-200 ring-purple-700/50',
  hideout: 'bg-orange-900/60 text-orange-200 ring-orange-700/50',
  flea: 'bg-teal-900/60 text-teal-200 ring-teal-700/50',
  fir: 'bg-rose-900/60 text-rose-200 ring-rose-700/50',
}

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        tones[tone] ?? tones.neutral
      }`}
    >
      {children}
    </span>
  )
}
