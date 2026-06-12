import { Fragment, useMemo, useState } from 'react'
import { useAmmo } from '../../data/useAmmo'
import { ARMOR_CLASSES, caliberLabel, penCellTier, penChance, penTier } from '../../lib/ammo'
import { formatShort } from '../../lib/format'
import type { Ammo } from '../../api/types'

type SortKey = 'penetrationPower' | 'damage' | 'name'

const OTHER = '__other'

function fmtPct(n: number | null): string {
  if (n == null || n === 0) return '—'
  const p = Math.round(n * 100)
  return (p > 0 ? '+' : '') + p + '%'
}

export function AmmoView() {
  const { data: ammo, isLoading, isError } = useAmmo()
  const [query, setQuery] = useState('')
  const [caliber, setCaliber] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('penetrationPower')
  const [minPen, setMinPen] = useState(0)

  const calibers = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of ammo ?? []) {
      const raw = a.caliber ?? OTHER
      if (!m.has(raw)) m.set(raw, caliberLabel(a.caliber))
    }
    return [...m.entries()]
      .map(([raw, label]) => ({ raw, label }))
      .sort((x, y) => x.label.localeCompare(y.label))
  }, [ammo])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, Ammo[]>()
    for (const a of ammo ?? []) {
      const raw = a.caliber ?? OTHER
      if (caliber !== 'all' && raw !== caliber) continue
      if (a.penetrationPower < minPen) continue
      if (
        q &&
        !a.item.name.toLowerCase().includes(q) &&
        !a.item.shortName.toLowerCase().includes(q) &&
        !caliberLabel(a.caliber).toLowerCase().includes(q)
      )
        continue
      const arr = map.get(raw) ?? []
      arr.push(a)
      map.set(raw, arr)
    }
    const sortFn = (x: Ammo, y: Ammo) => {
      if (sortKey === 'name') return x.item.name.localeCompare(y.item.name)
      return y[sortKey] - x[sortKey]
    }
    const out = [...map.entries()].map(([raw, rows]) => {
      rows.sort(sortFn)
      return { raw, label: caliberLabel(raw === OTHER ? null : raw), rows }
    })
    out.sort((x, y) => x.label.localeCompare(y.label))
    return out
  }, [ammo, query, caliber, minPen, sortKey])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('')
          }}
          placeholder="Search rounds (e.g. M995, BT, slug)…"
          className="w-56 rounded border border-neutral-700 bg-neutral-900 px-3 py-1 outline-none focus:border-neutral-500"
        />
        <label className="flex items-center gap-2">
          Caliber
          <select
            value={caliber}
            onChange={(e) => setCaliber(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          >
            <option value="all">All</option>
            {calibers.map((c) => (
              <option key={c.raw} value={c.raw}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Sort by
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          >
            <option value="penetrationPower">Penetration</option>
            <option value="damage">Damage</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Min pen
          <input
            type="number"
            min={0}
            value={minPen}
            onChange={(e) => setMinPen(Math.max(0, Number(e.target.value) || 0))}
            className="w-16 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span>Classes 1–6: first-shot penetration chance vs. fresh armor</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-900/60 ring-1 ring-emerald-700/50" />
          pens
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-900/40 ring-1 ring-yellow-700/50" />
          marginal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-950/40 ring-1 ring-red-900/60" />
          won’t
        </span>
      </div>

      {isLoading && <p className="text-neutral-500">Loading ammo…</p>}
      {isError && <p className="text-red-400">Couldn’t load ammo data.</p>}
      {!isLoading && !isError && groups.length === 0 && (
        <p className="text-neutral-500">No rounds match your filters.</p>
      )}

      {groups.length > 0 && (
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-neutral-950">
          <tr className="text-xs uppercase tracking-wide text-neutral-500">
            <th rowSpan={2} className="px-2 py-1 text-left align-bottom">Round</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Pen</th>
            <th colSpan={6} className="border-x border-neutral-800 px-1.5 py-1 text-center font-medium normal-case tracking-normal">
              Penetrates armor class
            </th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Dmg</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Armor</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Frag</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Vel</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Recoil</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Acc</th>
            <th rowSpan={2} className="px-2 py-1 text-right align-bottom">Flea</th>
          </tr>
          <tr className="text-xs uppercase tracking-wide text-neutral-500">
            {ARMOR_CLASSES.map((c) => (
              <th
                key={c}
                className={`px-1.5 py-1 text-center font-medium ${c === 1 ? 'border-l border-neutral-800' : ''} ${c === 6 ? 'border-r border-neutral-800' : ''}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.raw}>
              <tr>
                <td
                  colSpan={15}
                  className="bg-neutral-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300"
                >
                  {g.label} ({g.rows.length})
                </td>
              </tr>
              {g.rows.map((a) => {
                const tier = penTier(a.penetrationPower)
                return (
                  <tr key={a.item.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-2">
                        {a.item.iconLink && (
                          <img src={a.item.iconLink} alt="" className="h-5 w-5 object-contain" />
                        )}
                        <span>{a.item.name}</span>
                        {a.tracer && <span className="text-[10px] text-amber-500/70">tracer</span>}
                      </span>
                    </td>
                    <td className={`px-2 py-1 text-right font-semibold ${tier.text} ${tier.bg}`}>
                      {a.penetrationPower}
                    </td>
                    {ARMOR_CLASSES.map((c) => {
                      const chance = penChance(a.penetrationPower, c)
                      const cell = penCellTier(chance)
                      return (
                        <td
                          key={c}
                          className={`px-1.5 py-1 text-center text-xs tabular-nums ${cell.text} ${cell.bg} ${c === 1 ? 'border-l border-neutral-800/60' : ''} ${c === 6 ? 'border-r border-neutral-800/60' : ''}`}
                        >
                          {Math.round(chance)}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1 text-right">
                      {a.projectileCount && a.projectileCount > 1
                        ? `${a.damage}×${a.projectileCount}`
                        : a.damage}
                    </td>
                    <td className="px-2 py-1 text-right">{a.armorDamage}</td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {Math.round(a.fragmentationChance * 100)}%
                    </td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {a.initialSpeed ? Math.round(a.initialSpeed) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-neutral-400">{fmtPct(a.recoilModifier)}</td>
                    <td className="px-2 py-1 text-right text-neutral-400">{fmtPct(a.accuracyModifier)}</td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {a.item.avg24hPrice ? formatShort(a.item.avg24hPrice) : '—'}
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  )
}
