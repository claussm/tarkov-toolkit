import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { get, set } from 'idb-keyval'

const STORE_KEY = 'tt:progress:v1'

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
  isHideoutBuilt: (levelId: string) => boolean
  toggleHideout: (levelId: string) => void
  setPlayerLevel: (n: number) => void
  resetAll: () => void
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
    isHideoutBuilt: (levelId) => state.builtHideoutLevels.has(levelId),
    toggleHideout: (levelId) =>
      setState((s) => {
        const next = new Set(s.builtHideoutLevels)
        next.has(levelId) ? next.delete(levelId) : next.add(levelId)
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
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgress must be used within a ProgressProvider')
  return v
}
