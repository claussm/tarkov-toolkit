import type { ReactNode } from 'react'
import { useItemDetail } from '../../data/useItemDetail'
import { useHideoutIndex } from '../../data/useHideoutIndex'
import { useProgress } from '../../data/ProgressContext'
import { Badge } from '../../components/Badge'
import { bestVendorSell, fleaValue, keepSellVerdict, questItemCount, type VerdictTone } from '../../lib/heuristics'
import { formatRub } from '../../lib/format'
import { hideoutWikiUrl } from '../../lib/wiki'

export function ItemCard({ id }: { id: string }) {
  const { data: item, isLoading } = useItemDetail(id)
  const { data: hideout } = useHideoutIndex()
  const { isTaskDone, toggleTask, isHideoutBuilt, toggleHideout } = useProgress()

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

  const stillQuests = quests.filter((q) => !isTaskDone(q.id)).length
  const stillHideout = hideoutUses.filter((h) => !isHideoutBuilt(h.levelId)).length

  const verdict = keepSellVerdict({
    detail: item,
    stillNeededQuests: stillQuests,
    stillNeededHideout: stillHideout,
  })
  const flea = fleaValue(item)
  const vendor = bestVendorSell(item)

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
      </div>

      <Section title={`Quests — ${stillQuests} still needed / ${quests.length}`}>
        {quests.length === 0 ? (
          <Empty>Not needed for any quest.</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {quests.map((q) => {
              const done = isTaskDone(q.id)
              const reqCount = questItemCount(q, item.id)
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
                  {reqCount != null && <span className="text-xs text-neutral-400">×{reqCount}</span>}
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
                    onChange={() => toggleHideout(h.levelId)}
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
