import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProgressProvider } from './data/ProgressContext'
import { LookupView } from './features/lookup/LookupView'
import { ProgressView } from './features/progress/ProgressView'
import { AmmoView } from './features/ammo/AmmoView'

const queryClient = new QueryClient()

type Tab = 'lookup' | 'progress' | 'ammo' | 'maps'

const TABS: Tab[] = ['lookup', 'progress', 'ammo', 'maps']

export default function App() {
  const [tab, setTab] = useState<Tab>('lookup')

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
            {tab === 'lookup' && <LookupView />}
            {tab === 'progress' && <ProgressView />}
            {tab === 'ammo' && <AmmoView />}
            {tab === 'maps' && <Placeholder name="Interactive maps" milestone="M3" />}
          </main>

          <footer className="border-t border-neutral-800 px-4 py-1 text-center text-[10px] text-neutral-600">
            Data from tarkov.dev · Not affiliated with or endorsed by Battlestate Games
          </footer>
        </div>
      </ProgressProvider>
    </QueryClientProvider>
  )
}

function Placeholder({ name, milestone }: { name: string; milestone: string }) {
  return (
    <div className="p-12 text-center text-neutral-500">
      {name} — coming in {milestone}.
    </div>
  )
}
