import { useEffect } from 'react'

/** A small "how to use this" overlay. Closes on backdrop click or Escape. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-4 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-sm text-neutral-300 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-wide text-neutral-100">About Tarkov Toolkit</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-neutral-400">
          A second-monitor companion for Escape from Tarkov. Look up items, check ammo, and read maps
          without alt-tabbing through ten browser tabs.
        </p>

        <Section title="The tabs">
          <ul className="list-disc space-y-0.5 pl-5 text-neutral-400">
            <li>
              <b className="text-neutral-200">Lookup</b> — type an item name to see which quests and
              hideout modules need it, plus flea/vendor value and a keep-or-sell hint.
            </li>
            <li>
              <b className="text-neutral-200">Progress</b> — tick off quests and hideout levels so items
              you no longer need stop showing up.
            </li>
            <li>
              <b className="text-neutral-200">Ammo</b> — sortable penetration / damage chart by caliber.
            </li>
            <li>
              <b className="text-neutral-200">Maps</b> — pan/zoom maps with extract and spawn markers.
            </li>
          </ul>
        </Section>

        <Section title="Keyboard">
          <ul className="space-y-0.5 text-neutral-400">
            <li>
              <Key>/</Key> or <Key>Ctrl</Key>/<Key>⌘</Key>+<Key>K</Key> — jump to item search
            </li>
            <li>
              <Key>?</Key> — open this help · <Key>Esc</Key> — close
            </li>
          </ul>
        </Section>

        <Section title="Your progress stays on this device">
          <p className="text-neutral-400">
            Quests, hideout levels, and your PMC level are saved <b className="text-neutral-200">only in
            this browser</b> — there’s no account and nothing is synced. To back it up or move to another
            device, use <b className="text-neutral-200">Export</b> / <b className="text-neutral-200">Import</b>{' '}
            on the Progress tab.
          </p>
        </Section>

        <Section title="Install it">
          <p className="text-neutral-400">
            Use your browser’s install button (the ⊕ in the address bar, or “Add to Home Screen” on a
            phone) to get an app window that works offline.
          </p>
        </Section>

        <p className="mt-4 border-t border-neutral-800 pt-3 text-[11px] text-neutral-500">
          Data from{' '}
          <a
            href="https://tarkov.dev"
            target="_blank"
            rel="noreferrer"
            className="hover:text-sky-300 hover:underline"
          >
            tarkov.dev
          </a>
          . Not affiliated with or endorsed by Battlestate Games.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-200">
      {children}
    </kbd>
  )
}
