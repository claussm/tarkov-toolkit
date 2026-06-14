import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { get, set } from 'idb-keyval'

const STORE_KEY = 'tt:progress:v1'

// Tag written into exported files so import can reject unrelated JSON.
const EXPORT_FORMAT = 'tarkov-toolkit-progress'

interface PersistShape {
  completedTasks: string[]
  builtHideoutLevels: string[]
  playerLevel: number
}

interface ProgressState {
  completedTasks: Set<string>
  builtHideoutLevels: Set<string>
  playerLevel: number
  loaded: boolean
}

export interface ProgressApi extends ProgressState {
  isTaskDone: (id: string) => boolean
  toggleTask: (id: string) => void
  completeMany: (ids: string[]) => void
  uncompleteMany: (ids: string[]) => void
  isHideoutBuilt: (levelId: string) => boolean
  // Cascades: building a level also marks every lower level of the same station;
  // un-building it clears every higher level. `stationLevels` is the station's full
  // list of level numbers.
  setHideoutLevel: (stationId: string, level: number, stationLevels: number[]) => void
  setPlayerLevel: (n: number) => void
  resetAll: () => void
  exportProgress: () => string
  importProgress: (raw: string) => { ok: boolean; error?: string }
}

const Ctx = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>({
    completedTasks: new Set(),
    builtHideoutLevels: new Set(),
    playerLevel: 1,
    loaded: false,
  })

  // Load once from IndexedDB.
  useEffect(() => {
    let cancelled = false
    get<PersistShape>(STORE_KEY)
      .then((saved) => {
        if (cancelled) return
        setState({
          completedTasks: new Set(saved?.completedTasks ?? []),
          builtHideoutLevels: new Set(saved?.builtHideoutLevels ?? []),
          playerLevel: saved?.playerLevel ?? 1,
          loaded: true,
        })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loaded: true }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every change (after the initial load completes).
  useEffect(() => {
    if (!state.loaded) return
    const shape: PersistShape = {
      completedTasks: [...state.completedTasks],
      builtHideoutLevels: [...state.builtHideoutLevels],
      playerLevel: state.playerLevel,
    }
    set(STORE_KEY, shape).catch(() => {})
  }, [state])

  const api: ProgressApi = {
    ...state,
    isTaskDone: (id) => state.completedTasks.has(id),
    toggleTask: (id) =>
      setState((s) => {
        const next = new Set(s.completedTasks)
        next.has(id) ? next.delete(id) : next.add(id)
        return { ...s, completedTasks: next }
      }),
    completeMany: (ids) =>
      setState((s) => {
        const next = new Set(s.completedTasks)
        for (const id of ids) next.add(id)
        return { ...s, completedTasks: next }
      }),
    uncompleteMany: (ids) =>
      setState((s) => {
        const next = new Set(s.completedTasks)
        for (const id of ids) next.delete(id)
        return { ...s, completedTasks: next }
      }),
    isHideoutBuilt: (levelId) => state.builtHideoutLevels.has(levelId),
    // Hideout levels are sequential — you can't have L2 without L1. So building a
    // level marks every lower level too, and un-building it clears every higher one.
    setHideoutLevel: (stationId, level, stationLevels) =>
      setState((s) => {
        const next = new Set(s.builtHideoutLevels)
        const building = !next.has(`${stationId}-${level}`)
        for (const l of stationLevels) {
          if (building ? l <= level : l >= level) {
            const id = `${stationId}-${l}`
            building ? next.add(id) : next.delete(id)
          }
        }
        return { ...s, builtHideoutLevels: next }
      }),
    setPlayerLevel: (n) => setState((s) => ({ ...s, playerLevel: n })),
    resetAll: () =>
      setState((s) => ({
        ...s,
        completedTasks: new Set(),
        builtHideoutLevels: new Set(),
        playerLevel: 1,
      })),
    exportProgress: () =>
      JSON.stringify(
        {
          format: EXPORT_FORMAT,
          version: 1,
          exportedAt: new Date().toISOString(),
          completedTasks: [...state.completedTasks],
          builtHideoutLevels: [...state.builtHideoutLevels],
          playerLevel: state.playerLevel,
        },
        null,
        2,
      ),
    importProgress: (raw) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        return { ok: false, error: 'That file isn’t valid JSON.' }
      }
      const obj = parsed as Partial<PersistShape> & { format?: unknown }
      if (!obj || obj.format !== EXPORT_FORMAT) {
        return { ok: false, error: 'Not a Tarkov Toolkit progress export.' }
      }
      const onlyStrings = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
      const lvl = Number(obj.playerLevel)
      setState((s) => ({
        ...s,
        completedTasks: new Set(onlyStrings(obj.completedTasks)),
        builtHideoutLevels: new Set(onlyStrings(obj.builtHideoutLevels)),
        playerLevel: Number.isFinite(lvl) ? Math.max(1, Math.min(79, lvl)) : 1,
      }))
      return { ok: true }
    },
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgress must be used within a ProgressProvider')
  return v
}
