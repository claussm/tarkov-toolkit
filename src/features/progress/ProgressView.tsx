import { useMemo, useState, type ReactNode } from 'react'
import { useTasks } from '../../data/useTasks'
import { useHideoutIndex } from '../../data/useHideoutIndex'
import { useProgress } from '../../data/ProgressContext'
import { hideoutWikiUrl } from '../../lib/wiki'
import type { TaskSummary } from '../../api/types'

function isAvailable(t: TaskSummary, completed: Set<string>, playerLevel: number): boolean {
  if (t.minPlayerLevel && playerLevel < t.minPlayerLevel) return false
  for (const req of t.taskRequirements ?? []) {
    if (req.task && !completed.has(req.task.id)) return false
  }
  return true
}

export function ProgressView() {
  const { data: tasks, isLoading } = useTasks()
  const { data: hideout } = useHideoutIndex()
  const {
    completedTasks,
    builtHideoutLevels,
    playerLevel,
    isTaskDone,
    toggleTask,
    isHideoutBuilt,
    toggleHideout,
    setPlayerLevel,
    resetAll,
  } = useProgress()

  const [filter, setFilter] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [section, setSection] = useState<'quests' | 'hideout'>('quests')

  const byTrader = useMemo(() => {
    const map = new Map<string, TaskSummary[]>()
    const f = filter.trim().toLowerCase()
    for (const t of tasks ?? []) {
      if (f && !t.name.toLowerCase().includes(f)) continue
      if (onlyAvailable && !isAvailable(t, completedTasks, playerLevel)) continue
      const key = t.trader?.name ?? 'Other'
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.minPlayerLevel ?? 0) - (b.minPlayerLevel ?? 0))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks, filter, onlyAvailable, completedTasks, playerLevel])

  const doneCount = completedTasks.size
  const totalTasks = tasks?.length ?? 0

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          PMC level
          <input
            type="number"
            min={1}
            max={79}
            value={playerLevel}
            onChange={(e) =>
              setPlayerLevel(Math.max(1, Math.min(79, Number(e.target.value) || 1)))
            }
            className="w-16 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
        </label>
        <span className="text-sm text-neutral-400">
          {doneCount}/{totalTasks} quests · {builtHideoutLevels.size} hideout levels
        </span>
        <button
          onClick={() => {
            if (confirm('Reset ALL local progress (quests, hideout, level)? This cannot be undone.')) {
              resetAll()
            }
          }}
          className="ml-auto rounded border border-red-800 px-3 py-1 text-sm text-red-300 hover:bg-red-950"
        >
          Reset progress (wipe day)
        </button>
      </div>

      <div className="flex gap-1">
        <SectionTab active={section === 'quests'} onClick={() => setSection('quests')}>
          Quests
        </SectionTab>
        <SectionTab active={section === 'hideout'} onClick={() => setSection('hideout')}>
          Hideout
        </SectionTab>
      </div>

      {section === 'quests' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter quests…"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-emerald-500"
              />
              Only available now
            </label>
          </div>

          {isLoading && <p className="text-neutral-500">Loading quests…</p>}

          {byTrader.map(([trader, list]) => (
            <div key={trader}>
              <h3 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {trader} ({list.length})
              </h3>
              <ul className="flex flex-col gap-0.5">
                {list.map((t) => {
                  const done = isTaskDone(t.id)
                  return (
                    <li
                      key={t.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        done ? 'opacity-40' : 'hover:bg-neutral-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleTask(t.id)}
                        className="accent-emerald-500"
                      />
                      {t.wikiLink ? (
                        <a
                          href={t.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Open on the wiki"
                          className={`flex-1 hover:text-sky-300 hover:underline ${done ? 'line-through' : ''}`}
                        >
                          {t.name}
                        </a>
                      ) : (
                        <span className={`flex-1 ${done ? 'line-through' : ''}`}>{t.name}</span>
                      )}
                      {t.kappaRequired && <span className="text-[10px] text-amber-500/80">κ</span>}
                      {t.minPlayerLevel ? (
                        <span className="text-xs text-neutral-500">lv{t.minPlayerLevel}</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </>
      )}

      {section === 'hideout' && (
        <div className="flex flex-col gap-3">
          {[...(hideout?.stations ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((st) => (
              <div key={st.id}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <a
                    href={hideoutWikiUrl(st.name)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open on the wiki"
                    className="hover:text-sky-300 hover:underline"
                  >
                    {st.name}
                  </a>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[...st.levels]
                    .sort((a, b) => a.level - b.level)
                    .map((lvl) => {
                      const levelId = `${st.id}-${lvl.level}`
                      const built = isHideoutBuilt(levelId)
                      return (
                        <button
                          key={levelId}
                          onClick={() => toggleHideout(levelId)}
                          className={`rounded px-2 py-1 text-xs ring-1 ring-inset ${
                            built
                              ? 'bg-emerald-900/50 text-emerald-200 ring-emerald-700/50'
                              : 'bg-neutral-800 text-neutral-300 ring-neutral-700 hover:bg-neutral-700'
                          }`}
                        >
                          L{lvl.level} {built ? '✓' : ''}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function SectionTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm ${
        active ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {children}
    </button>
  )
}
