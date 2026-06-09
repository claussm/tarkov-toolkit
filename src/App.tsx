import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProgressProvider } from './data/ProgressContext'
import { LookupView } from './features/lookup/LookupView'
import { ProgressView } from './features/progress/ProgressView'
import { AmmoView } from './features/ammo/AmmoView'
import { MapsView } from './features/maps/MapsView'

const queryClient = new QueryClient()

type Tab = 'lookup' | 'progress' | 'ammo' | 'maps'

const TABS: Tab[] = ['lookup', 'progress', 'ammo', 'maps']

const TAB_STORAGE_KEY = 'tt:lastTab'

function loadInitialTab(): Tab {
  const stored = localStorage.getItem(TAB_STORAGE_KEY)
  return stored && (TABS as string[]).includes(stored) ? (stored as Tab) : 'lookup'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(loadInitialTab)
  // Bumped whenever the user requests focus on the search box via the global hotkey.
  const [focusSignal, setFocusSignal] = useState(0)

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  }, [tab])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      // "/" focuses search, but not while typing into a field (so you can type a literal slash).
      const slash = e.key === '/' && !typing
      if (cmdK || slash) {
        e.preventDefault()
        setTab('lookup')
        setFocusSignal((n) => n + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ProgressProvider>
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-4 border-b border-neutral-800 px-4 py-2">
            <h1 className="text-sm font-bold tracking-widest text-neutral-300">TARKOV TOOLKIT</h1>
            <nav className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1 text-sm capitalize ${
                    tab === t ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 overflow-auto">
            {tab === 'lookup' && <LookupView focusSignal={focusSignal} />}
            {tab === 'progress' && <ProgressView />}
            {tab === 'ammo' && <AmmoView />}
            {tab === 'maps' && <MapsView />}
          </main>

          <footer className="border-t border-neutral-800 px-4 py-1 text-center text-[10px] text-neutral-600">
            Data from tarkov.dev · Not affiliated with or endorsed by Battlestate Games
          </footer>
        </div>
      </ProgressProvider>
    </QueryClientProvider>
  )
}
