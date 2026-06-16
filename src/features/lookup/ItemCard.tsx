import type { ReactNode } from 'react'
import { useItemDetail } from '../../data/useItemDetail'
import { useHideoutIndex } from '../../data/useHideoutIndex'
import { useLockIndex } from '../../data/useLockIndex'
import { useProgress } from '../../data/ProgressContext'
import { Badge } from '../../components/Badge'
import { bestVendorSell, fleaValue, keepSellVerdict, questItemReq, type VerdictTone } from '../../lib/heuristics'
import { formatRub, formatDuration } from '../../lib/format'
import { hideoutWikiUrl } from '../../lib/wiki'

export function ItemCard({ id }: { id: string }) {
  const { data: item, isLoading } = useItemDetail(id)
  const { data: hideout } = useHideoutIndex()
  const isKey = item?.types?.includes('keys') ?? false
  const { data: lockIndex } = useLockIndex(isKey)
  const { isTaskDone, toggleTask, isHideoutBuilt, setHideoutLevel } = useProgress()

  if (isLoading) {
    return (
      <Card>
        <p className="text-neutral-400">Loading…</p>
      </Card>
    )
  }
  if (!item) {
    return (
      <Card>
        <p className="text-neutral-400">Item not found.</p>
      </Card>
    )
  }

  const quests = item.usedInTasks ?? []
  const hideoutUses = hideout?.byItemId.get(item.id) ?? []
  const crafts = item.craftsFor ?? []

  const stillQuests = quests.filter((q) => !isTaskDone(q.id)).length
  const stillHideout = hideoutUses.filter((h) => !isHideoutBuilt(h.levelId)).length

  // Total quantity that must be Found in Raid across quests not yet completed.
  // (Hideout construction never requires FiR, so it doesn't count here.)
  const firStillNeeded = quests.reduce((sum, q) => {
    if (isTaskDone(q.id)) return sum
    const req = questItemReq(q, item.id)
    return req?.foundInRaid ? sum + (req.count ?? 0) : sum
  }, 0)

  const verdict = keepSellVerdict({
    detail: item,
    stillNeededQuests: stillQuests,
    stillNeededHideout: stillHideout,
  })
  const flea = fleaValue(item)
  const vendor = bestVendorSell(item)

  const lockMaps = lockIndex?.get(item.id) ?? []

  return (
    <Card>
      <div className="flex items-start gap-3">
        {item.iconLink && (
          <img src={item.iconLink} alt="" className="h-12 w-12 rounded object-contain" />
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <p className="text-xs text-neutral-500">{item.shortName}</p>
        </div>
        {item.wikiLink && (
          <a
            href={item.wikiLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-sky-400 hover:underline"
          >
            wiki ↗
          </a>
        )}
      </div>

      <div className={`mt-3 w-full rounded-md px-3 py-2 text-sm font-semibold ${verdictClass(verdict.tone)}`}>
        {verdict.label}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="flea">Flea {flea != null ? formatRub(flea) : 'banned / none'}</Badge>
        {item.changeLast48hPercent != null && (
          <Badge tone="neutral">
            {item.changeLast48hPercent >= 0 ? '▲' : '▼'} {Math.abs(item.changeLast48hPercent).toFixed(1)}% / 48h
          </Badge>
        )}
        {vendor && (
          <Badge tone="vendor">
            {vendor.name} {formatRub(vendor.price)}
          </Badge>
        )}
        {firStillNeeded > 0 && (
          <Badge tone="fir">✓ {firStillNeeded} needed Found in Raid</Badge>
        )}
        {crafts.length > 0 && <Badge tone="hideout">⚒ craftable in hideout</Badge>}
      </div>

      {isKey && (
        <Section title="Behind the lock">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {item.properties?.uses != null && (
                <Badge tone="neutral">
                  {item.properties.uses} use{item.properties.uses === 1 ? '' : 's'}
                </Badge>
              )}
              {lockMaps.length > 0 ? (
                lockMaps.map(({ map, count }) => (
                  <Badge key={map} tone="vendor">
                    {map}
                    {count > 1 ? ` ×${count}` : ''}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-neutral-600">No mapped locks.</span>
              )}
            </div>
            {item.wikiLink && (
              <a
                href={`${item.wikiLink}#Behind_the_Lock`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded bg-amber-900/40 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-inset ring-amber-700/50 hover:bg-amber-900/60"
              >
                View loot behind the lock on the wiki ↗
              </a>
            )}
          </div>
        </Section>
      )}

      <Section title={`Quests — ${stillQuests} still needed / ${quests.length}`}>
        {quests.length === 0 ? (
          <Empty>Not needed for any quest.</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {quests.map((q) => {
              const done = isTaskDone(q.id)
              const req = questItemReq(q, item.id)
              return (
                <li
                  key={q.id}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    done ? 'opacity-40' : 'bg-neutral-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleTask(q.id)}
                    className="accent-emerald-500"
                  />
                  {q.wikiLink ? (
                    <a
                      href={q.wikiLink}
                      target="_blank"
                      rel="noreferrer"
                      title="Open on the wiki"
                      className={`flex-1 text-sm hover:text-sky-300 hover:underline ${done ? 'line-through' : ''}`}
                    >
                      {q.name}
                    </a>
                  ) : (
                    <span className={`flex-1 text-sm ${done ? 'line-through' : ''}`}>{q.name}</span>
                  )}
                  {req?.count != null && <span className="text-xs text-neutral-400">×{req.count}</span>}
                  {req?.foundInRaid && (
                    <span
                      title="Must be Found in Raid"
                      className="rounded bg-rose-900/60 px-1 text-[10px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-700/50"
                    >
                      FiR
                    </span>
                  )}
                  {q.trader && <span className="text-xs text-neutral-500">{q.trader.name}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title={`Hideout — ${stillHideout} still needed / ${hideoutUses.length}`}>
        {hideoutUses.length === 0 ? (
          <Empty>Not needed for any hideout module.</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {hideoutUses.map((h) => {
              const built = isHideoutBuilt(h.levelId)
              return (
                <li
                  key={h.levelId}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    built ? 'opacity-40' : 'bg-neutral-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={built}
                    onChange={() =>
                      setHideoutLevel(
                        h.stationId,
                        h.level,
                        hideout?.stations.find((s) => s.id === h.stationId)?.levels.map((l) => l.level) ?? [h.level],
                      )
                    }
                    className="accent-emerald-500"
                  />
                  <span className={`flex-1 text-sm ${built ? 'line-through' : ''}`}>
                    <a
                      href={hideoutWikiUrl(h.station)}
                      target="_blank"
                      rel="noreferrer"
                      title="Open on the wiki"
                      className="hover:text-sky-300 hover:underline"
                    >
                      {h.station}
                    </a>{' '}
                    <span className="text-neutral-500">L{h.level}</span>
                  </span>
                  <span className="text-xs text-neutral-400">×{h.count}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {crafts.length > 0 && (
        <Section title={`Craftable in hideout — ${crafts.length}`}>
          <p className="mb-1 text-xs text-neutral-500">Crafted items come out Found in Raid.</p>
          <ul className="flex flex-col gap-1">
            {crafts.map((c) => {
              const out = c.rewardItems.find((r) => r.item?.id === item.id)?.count ?? 1
              return (
                <li key={c.id} className="flex items-center gap-2 rounded bg-neutral-800/40 px-2 py-1 text-sm">
                  <span className="flex-1">
                    <a
                      href={hideoutWikiUrl(c.station?.name ?? '')}
                      target="_blank"
                      rel="noreferrer"
                      title="Open on the wiki"
                      className="hover:text-sky-300 hover:underline"
                    >
                      {c.station?.name ?? 'Hideout'}
                    </a>{' '}
                    <span className="text-neutral-500">L{c.level}</span>
                    {c.taskUnlock && (
                      <span className="ml-2 text-xs text-neutral-500">needs: {c.taskUnlock.name}</span>
                    )}
                  </span>
                  {out > 1 && <span className="text-xs text-neutral-400">×{out}</span>}
                  <span className="text-xs text-neutral-400">~{formatDuration(c.duration)}</span>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </Card>
  )
}

function verdictClass(tone: VerdictTone): string {
  switch (tone) {
    case 'keep':
      return 'bg-emerald-900/50 text-emerald-200 ring-1 ring-inset ring-emerald-700/50'
    case 'sell':
      return 'bg-amber-900/50 text-amber-200 ring-1 ring-inset ring-amber-700/50'
    case 'vendor':
      return 'bg-sky-900/50 text-sky-200 ring-1 ring-inset ring-sky-700/50'
    default:
      return 'bg-neutral-800 text-neutral-300 ring-1 ring-inset ring-neutral-700'
  }
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">{children}</div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-600">{children}</p>
}
