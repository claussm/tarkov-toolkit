import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTasks } from '../../data/useTasks'
import { useHideoutIndex } from '../../data/useHideoutIndex'
import { useProgress } from '../../data/ProgressContext'
import { hideoutWikiUrl } from '../../lib/wiki'
import type { TaskSummary } from '../../api/types'

// Rough in-game trader ordering so the tabs read the way the Tasks screen does.
// Matched case-insensitively; unknown traders fall to the end, alphabetically.
const TRADER_ORDER = [
  'prapor',
  'therapist',
  'fence',
  'skier',
  'peacekeeper',
  'mechanic',
  'ragman',
  'jaeger',
  'ref',
  'lightkeeper',
  'btr driver',
]
const traderRank = (name: string) => {
  const i = TRADER_ORDER.indexOf(name.toLowerCase())
  return i === -1 ? TRADER_ORDER.length : i
}

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
    completeMany,
    uncompleteMany,
    isHideoutBuilt,
    setHideoutLevel,
    setPlayerLevel,
    resetAll,
    exportProgress,
    importProgress,
  } = useProgress()

  const [filter, setFilter] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [hideLocked, setHideLocked] = useState(false)
  const [trader, setTrader] = useState('') // '' resolves to the first trader once tasks load
  const [section, setSection] = useState<'quests' | 'hideout'>('quests')
  // Records whether Shift was held on the most recent checkbox click, read by
  // onChange to decide between a single toggle and a whole-chain cascade.
  const shiftHeld = useRef(false)
  const [ioMsg, setIoMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tarkov-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setIoMsg({ ok: true, text: 'Progress backed up to a downloaded file.' })
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file later
    if (!file) return
    const result = importProgress(await file.text())
    setIoMsg(
      result.ok
        ? { ok: true, text: 'Progress imported from file.' }
        : { ok: false, text: result.error ?? 'Could not import that file.' },
    )
  }

  // Build the prerequisite graph once per task list. `prereqsOf` returns every
  // task that must be done before `id` (transitively); `dependentsOf` returns
  // every task that requires `id` (transitively). Used by the cascade actions.
  const { prereqsOf, dependentsOf } = useMemo(() => {
    const forward = new Map<string, string[]>() // id -> direct prerequisites
    const reverse = new Map<string, string[]>() // id -> direct dependents
    const known = new Set((tasks ?? []).map((t) => t.id))
    for (const t of tasks ?? []) {
      const reqs = (t.taskRequirements ?? [])
        .map((r) => r.task?.id)
        .filter((id): id is string => !!id && known.has(id))
      forward.set(t.id, reqs)
      for (const r of reqs) {
        const arr = reverse.get(r) ?? []
        arr.push(t.id)
        reverse.set(r, arr)
      }
    }
    const closure = (start: string, edges: Map<string, string[]>) => {
      const seen = new Set<string>()
      const stack = [...(edges.get(start) ?? [])]
      while (stack.length) {
        const cur = stack.pop()!
        if (seen.has(cur)) continue
        seen.add(cur)
        for (const n of edges.get(cur) ?? []) stack.push(n)
      }
      return [...seen]
    }
    return {
      prereqsOf: (id: string) => closure(id, forward),
      dependentsOf: (id: string) => closure(id, reverse),
    }
  }, [tasks])

  function cascadeComplete(id: string) {
    completeMany([id, ...prereqsOf(id)])
  }
  function cascadeUncomplete(id: string) {
    uncompleteMany([id, ...dependentsOf(id)])
  }
  // "I'm on this quest": everything it requires is done, but the quest itself
  // stays active (unchecked). Mirrors reading your in-game active quest log.
  function markActive(id: string) {
    completeMany(prereqsOf(id))
  }

  // Human-readable reasons a quest is currently locked (unmet prereqs / level).
  function lockReasons(t: TaskSummary): string[] {
    const out: string[] = []
    if (t.minPlayerLevel && playerLevel < t.minPlayerLevel)
      out.push(`reach level ${t.minPlayerLevel}`)
    for (const req of t.taskRequirements ?? []) {
      if (req.task && !completedTasks.has(req.task.id)) out.push(req.task.name)
    }
    return out
  }

  // One entry per trader with progress counts — drives the tab bar. Independent
  // of the filter/toggles so tabs and their counts stay stable as you work.
  const traderTabs = useMemo(() => {
    const counts = new Map<string, { done: number; total: number }>()
    for (const t of tasks ?? []) {
      const key = t.trader?.name ?? 'Other'
      const c = counts.get(key) ?? { done: 0, total: 0 }
      c.total++
      if (completedTasks.has(t.id)) c.done++
      counts.set(key, c)
    }
    return [...counts.entries()]
      .map(([name, c]) => ({ name, ...c }))
      .sort((a, b) => traderRank(a.name) - traderRank(b.name) || a.name.localeCompare(b.name))
  }, [tasks, completedTasks])

  // Resolve the selected trader: default to the first one until the user picks.
  const activeTrader =
    trader && (trader === 'All' || traderTabs.some((t) => t.name === trader))
      ? trader
      : (traderTabs[0]?.name ?? 'All')

  const byTrader = useMemo(() => {
    const map = new Map<string, TaskSummary[]>()
    const f = filter.trim().toLowerCase()
    for (const t of tasks ?? []) {
      if (f && !t.name.toLowerCase().includes(f)) continue
      const key = t.trader?.name ?? 'Other'
      if (activeTrader !== 'All' && key !== activeTrader) continue
      const done = completedTasks.has(t.id)
      const available = isAvailable(t, completedTasks, playerLevel)
      if (hideCompleted && done) continue
      if (hideLocked && !done && !available) continue
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.minPlayerLevel ?? 0) - (b.minPlayerLevel ?? 0))
    }
    return [...map.entries()].sort((a, b) => traderRank(a[0]) - traderRank(b[0]))
  }, [tasks, filter, activeTrader, hideCompleted, hideLocked, completedTasks, playerLevel])

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
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleExport}
            title="Download your progress as a backup file you can keep or move to another device"
            className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Load progress from a previously exported file (replaces current progress)"
            className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Import
          </button>
          <button
            onClick={() => {
              if (confirm('Reset ALL local progress (quests, hideout, level)? This cannot be undone.')) {
                resetAll()
                setIoMsg(null)
              }
            }}
            className="rounded border border-red-800 px-3 py-1 text-sm text-red-300 hover:bg-red-950"
          >
            Reset progress (wipe day)
          </button>
        </div>
      </div>

      {ioMsg && (
        <p className={`text-xs ${ioMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{ioMsg.text}</p>
      )}

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
          <div className="flex flex-wrap gap-1">
            <TraderTab active={activeTrader === 'All'} onClick={() => setTrader('All')}>
              All
            </TraderTab>
            {traderTabs.map((tt) => (
              <TraderTab
                key={tt.name}
                active={activeTrader === tt.name}
                onClick={() => setTrader(tt.name)}
              >
                {tt.name}
                <span className="ml-1 text-[10px] opacity-70">
                  {tt.done}/{tt.total}
                </span>
              </TraderTab>
            ))}
          </div>

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
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="accent-emerald-500"
              />
              Hide completed
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={hideLocked}
                onChange={(e) => setHideLocked(e.target.checked)}
                className="accent-emerald-500"
              />
              Hide locked
            </label>
          </div>

          <p className="text-xs text-neutral-500">
            Tip: go down your in-game active quest list and click{' '}
            <span className="text-emerald-400">I’m on this</span> on each one — it marks everything
            that quest requires as done and leaves the quest itself active. Tick the box once you’ve
            actually finished a quest. Power moves: shift-click a box to mark its whole chain done
            through that point, or shift-click a finished quest to roll back from there.
          </p>

          {isLoading && <p className="text-neutral-500">Loading quests…</p>}

          {!isLoading && byTrader.length === 0 && (
            <p className="text-neutral-500">No quests match.</p>
          )}

          {byTrader.map(([traderName, list]) => (
            <div key={traderName}>
              {activeTrader === 'All' && (
                <h3 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {traderName} ({list.length})
                </h3>
              )}
              <ul className="flex flex-col gap-0.5">
                {list.map((t) => {
                  const done = isTaskDone(t.id)
                  const locked = !done && !isAvailable(t, completedTasks, playerLevel)
                  const reasons = locked ? lockReasons(t) : []
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
                        onClick={(e) => {
                          shiftHeld.current = e.shiftKey
                        }}
                        onChange={() => {
                          if (shiftHeld.current) {
                            done ? cascadeUncomplete(t.id) : cascadeComplete(t.id)
                          } else {
                            toggleTask(t.id)
                          }
                        }}
                        title="Click to toggle · shift-click to include the whole chain"
                        className="cursor-pointer accent-emerald-500"
                      />
                      {locked && (
                        <span
                          title={`Locked — needs: ${reasons.join(', ')}`}
                          className="text-xs text-neutral-600"
                        >
                          🔒
                        </span>
                      )}
                      {t.wikiLink ? (
                        <a
                          href={t.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Open on the wiki"
                          className={`flex-1 hover:text-sky-300 hover:underline ${done ? 'line-through' : ''} ${locked ? 'text-neutral-500' : ''}`}
                        >
                          {t.name}
                        </a>
                      ) : (
                        <span
                          className={`flex-1 ${done ? 'line-through' : ''} ${locked ? 'text-neutral-500' : ''}`}
                        >
                          {t.name}
                        </span>
                      )}
                      {t.kappaRequired && <span className="text-[10px] text-amber-500/80">κ</span>}
                      {t.minPlayerLevel ? (
                        <span className="text-xs text-neutral-500">lv{t.minPlayerLevel}</span>
                      ) : null}
                      {!done && (
                        <button
                          onClick={() => markActive(t.id)}
                          title="I'm on this quest — mark everything it requires as done and leave this one active"
                          className="shrink-0 rounded px-1 text-xs text-neutral-600 hover:bg-emerald-900/40 hover:text-emerald-300"
                        >
                          I’m on this
                        </button>
                      )}
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
                          onClick={() =>
                            setHideoutLevel(st.id, lvl.level, st.levels.map((l) => l.level))
                          }
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

function TraderTab({
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
      className={`rounded px-2.5 py-1 text-xs ring-1 ring-inset ${
        active
          ? 'bg-neutral-700 text-white ring-neutral-600'
          : 'text-neutral-400 ring-neutral-800 hover:bg-neutral-800 hover:text-neutral-200'
      }`}
    >
      {children}
    </button>
  )
}
