import { Fragment, useMemo, useState } from 'react'
import { useAmmo } from '../../data/useAmmo'
import { caliberLabel, penTier } from '../../lib/ammo'
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
    const map = new Map<string, Ammo[]>()
    for (const a of ammo ?? []) {
      const raw = a.caliber ?? OTHER
      if (caliber !== 'all' && raw !== caliber) continue
      if (a.penetrationPower < minPen) continue
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
  }, [ammo, caliber, minPen, sortKey])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
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

      {isLoading && <p className="text-neutral-500">Loading ammo…</p>}
      {isError && <p className="text-red-400">Couldn’t load ammo data.</p>}

      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-neutral-950">
          <tr className="text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-2 py-1 text-left">Round</th>
            <th className="px-2 py-1 text-right">Pen</th>
            <th className="px-2 py-1 text-right">Dmg</th>
            <th className="px-2 py-1 text-right">Armor</th>
            <th className="px-2 py-1 text-right">Frag</th>
            <th className="px-2 py-1 text-right">Vel</th>
            <th className="px-2 py-1 text-right">Recoil</th>
            <th className="px-2 py-1 text-right">Acc</th>
            <th className="px-2 py-1 text-right">Flea</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.raw}>
              <tr>
                <td
                  colSpan={9}
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
  )
}
