# Tarkov Toolkit — Build Plan

A second-monitor companion app for Escape from Tarkov. One window, glanceable, keyboard-first:
item lookup (quest / hideout / flea), an ammo chart, and interactive maps. Replaces the
"ten browser tabs" workflow.

> **Decisions locked in for v1**
> - **Modality:** static web app / installable PWA (no desktop wrapper, no backend)
> - **AI:** none in v1 — deterministic fuzzy search + structured data (AI is a documented future add-on)
> - **Data:** everything from the free, CORS-open **tarkov.dev GraphQL API** — no scraping
> - **Progress:** quest/hideout completion tracked **locally only** (no account, no external sync); part of M1

---

## 1. Scope

### v1 features
1. **Item lookup** — type a name, instantly see: needed for which quests, needed for which
   hideout modules, and flea/vendor value, with a simple "keep or sell" heuristic.
2. **Ammo chart** — sortable/filterable table grouped by caliber (pen, damage, armor damage,
   fragmentation, buckshot pellet count), with color-coded armor effectiveness.
3. **Interactive maps** — pan/zoom map per location with extract + spawn markers.
4. **Progress tracking (local)** — mark quests/hideout modules done so items you no longer need drop
   out of the lookup. Stored locally on your machine, no account or sync. Built as part of M1 (§6),
   design in §7.5.

### Non-goals for v1 (revisit later)
- AI natural-language lookup & one-line verdicts (architecture reserved — see §11)
- Desktop app / always-on-top window (Tauri upgrade path reserved — see §11)
- Any account or external progress sync (TarkovTracker, etc.) — progress stays **local-only by design**
- Loadout builder, barter/craft profit calc
- Multi-floor map layer switching, full loot/key marker sets
- Cloud sync / multi-device (local IndexedDB persistence is the model)

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build/dev | **Vite** | Fast, zero-config static output, trivial PWA plugin |
| UI | **React + TypeScript** | Typed GraphQL responses, large ecosystem |
| Data fetching | **`graphql-request`** + **TanStack Query** | Tiny GraphQL client; Query handles caching/staleness/retries |
| Local cache | **IndexedDB** via `idb-keyval` | Persist the bulk item/ammo/hideout payloads across sessions |
| Fuzzy search | **Fuse.js** | Instant, offline, typo-tolerant over ~3,000 items |
| Maps | **Leaflet** (`L.CRS.Simple`) | Exactly what tarkov.dev uses; transform code is copy-pasteable (MIT) |
| Styling | **Tailwind CSS** (or CSS modules) | Dense, dark, glanceable UI quickly |
| PWA | **`vite-plugin-pwa`** | Installable standalone window + offline caching |
| Hosting | **Vercel / Netlify / GitHub Pages** | Static; auto-deploy on push. Or just `vite preview` locally |

No backend is required for v1. The single most important enabling fact (verified live): the
tarkov.dev GraphQL endpoint returns `Access-Control-Allow-Origin: *`, so the browser can call
it directly.

---

## 3. Architecture

```
┌──────────────────────── Browser window (monitor 2) ────────────────────────┐
│  Top bar: 🔎 global item search  ·  [Lookup] [Ammo] [Maps]  ·  data freshness │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Active panel (Lookup result card / Ammo table / Leaflet map)           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
        │  direct fetch (CORS open, no key, no proxy)
        ▼
   api.tarkov.dev/graphql                 assets.tarkov.dev (map SVGs) → self-hosted in /public
        │
   TanStack Query + IndexedDB cache (item index, ammo, hideout map cached locally)
```

Data layers:
- **Bulk reference data** fetched once and cached: item index, ammo list, hideout requirements,
  map marker data. Refreshed in the background (prices are server-cached ~5 min).
- **Per-item detail** fetched on selection (quests that use the item, full price breakdown).
- **Local progress** (completed quests / built hideout levels / player level) persisted in IndexedDB;
  never leaves the machine. Used to filter "already done" items out of the lookup.

---

## 4. Project structure

```
tarkov-toolkit/
├─ index.html
├─ vite.config.ts            # + vite-plugin-pwa
├─ public/
│  └─ maps/                  # self-hosted SVGs (Customs.svg, Factory.svg, …) CC BY-NC-SA
│     └─ icons/              # marker icons (extract_pmc.png, spawn_scav.png, …)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                # layout shell, tab routing, global search box
│  ├─ api/
│  │  ├─ client.ts           # graphql-request client → api.tarkov.dev/graphql
│  │  ├─ queries.ts          # all GraphQL query documents (see §5)
│  │  └─ types.ts            # generated/handwritten TS types for responses
│  ├─ data/
│  │  ├─ useItemIndex.ts     # bulk item list + Fuse.js index (cached)
│  │  ├─ useAmmo.ts          # ammo list (cached)
│  │  ├─ useHideoutIndex.ts  # hideout requirements → reverse itemId→modules index
│  │  ├─ useItemDetail.ts    # per-item detail (quests, prices) on demand
│  │  └─ useProgress.ts      # local completion store (IndexedDB) — quests/hideout done state
│  ├─ maps/
│  │  ├─ mapConfigs.ts       # transform/rotation/bounds per map (lifted from tarkov.dev maps.json)
│  │  ├─ crs.ts              # getCRS/applyRotation/pos helpers (lifted from tarkov.dev, MIT)
│  │  └─ MapView.tsx         # Leaflet component
│  ├─ features/
│  │  ├─ lookup/             # search box, result card, badges, keep/sell heuristic
│  │  ├─ ammo/               # sortable grouped table, effectiveness coloring
│  │  ├─ progress/           # quest + hideout check-off screens, wipe reset
│  │  └─ maps/               # map switcher + MapView wrapper
│  ├─ components/            # shared UI (Badge, Price, ItemIcon, Table…)
│  └─ lib/                   # formatting (roubles), heuristics, cache helpers
└─ BUILD_PLAN.md             # this file
```

---

## 5. Data layer — GraphQL queries (copy-paste ready)

All against `https://api.tarkov.dev/graphql`, POST, `Content-Type: application/json`,
body `{ "query": "...", "variables": {...} }`. No auth.

### 5.1 Item index (bulk; powers search + flea badge)
Lean fields to keep the payload small; detail is fetched on selection.
```graphql
query ItemIndex {
  items {
    id
    name
    shortName
    normalizedName
    iconLink
    avg24hPrice
    lastLowPrice
    basePrice
    types
  }
}
```
Build a Fuse.js index over `name` + `shortName` (weight name higher). Cache the array in IndexedDB.

### 5.2 Hideout requirements (bulk; build reverse index)
There is **no item→hideout backlink** in the schema, so fetch all stations once and invert.
```graphql
query HideoutRequirements {
  hideoutStations {
    id
    name
    normalizedName
    levels {
      level
      itemRequirements {
        item { id name }
        count
      }
    }
  }
}
```
Transform into `Map<itemId, { station, level, count }[]>` at load.

### 5.3 Ammo (bulk; powers the ammo chart)
```graphql
query Ammo {
  ammo {
    item { id name shortName iconLink avg24hPrice }
    caliber
    ammoType
    damage
    armorDamage
    penetrationPower
    fragmentationChance
    ricochetChance
    projectileCount
    accuracyModifier
    recoilModifier
    initialSpeed
    tracer
  }
}
```
Group rows by `caliber` (it's an enum-like string, e.g. `Caliber556x45NATO` → friendly label map).

### 5.4 Item detail (on selection; quests + full price)
`objectives` is a GraphQL **interface** — you MUST use an inline fragment or you get only typenames.
```graphql
query ItemDetail($id: ID!) {
  item(id: $id) {
    id
    name
    shortName
    wikiLink
    iconLink
    image512pxLink
    basePrice
    avg24hPrice
    lastLowPrice
    high24hPrice
    changeLast48hPercent
    fleaMarketFee
    sellFor { vendor { name normalizedName } priceRUB }
    usedInTasks {
      id
      name
      trader { name }
      minPlayerLevel
      kappaRequired
      objectives {
        __typename
        ... on TaskObjectiveItem {
          item { id name }
          count
          foundInRaid
        }
      }
    }
  }
}
```

### 5.5 Map markers (per map; for the maps feature)
```graphql
query MapMarkers {
  maps {
    id
    name
    normalizedName
    extracts { name faction position { x y z } }
    spawns { sides categories position { x y z } }
  }
}
```
Filter client-side by `normalizedName` (e.g. `"customs"`). Add hazards/transits/locks later.

### Caching policy
- **Item index / ammo / map markers:** cache in IndexedDB; treat as fresh for ~10 min,
  refetch in background. (Server sends `cache-control: max-age=300`.)
- **Hideout requirements:** cache long (changes only on game patches) — daily refresh is fine.
- **Item detail:** TanStack Query, 5-min stale time.
- Be a good citizen of a free community API: never fetch per-keystroke; search is purely local
  against the cached index. Only fetch detail on explicit item selection.
- Null-guard prices: `avg24hPrice`/`lastLowPrice` are `null` for flea-banned / no-offer items —
  fall back to the best vendor `sellFor` price.

---

## 6. Milestones

Ordered by value-per-effort. Each milestone is independently shippable.

### M0 — Scaffold (½ day)
- `npm create vite@latest` (React + TS), add Tailwind, TanStack Query, graphql-request,
  Fuse.js, idb-keyval, vite-plugin-pwa.
- GraphQL client in `api/client.ts`; smoke-test with the ItemIndex query.
- App shell: top bar with search box + tab nav (Lookup / Ammo / Maps), dark theme.
- **Done when:** app builds, loads the item index, logs count to console.

### M1 — Item lookup + local progress tracking (2–3 days) ← the killer feature, do first

**Lookup:**
- `useItemIndex` (bulk fetch + Fuse.js) and `useHideoutIndex` (reverse index).
- Search box → live Fuse results dropdown (icon + name + short name + flea price).
- On select → `useItemDetail` → **result card** with badges:
  - `Quest ×N` (list quest names + required count + FiR flag from `usedInTasks`)
  - `Hideout` (station + level + count, from the reverse index)
  - `Flea ~45k` (avg24h, with lastLow + 48h change), plus best vendor sell
  - **Keep/Sell verdict** heuristic (see §7)
- Link out to `wikiLink` (new tab) for anything deeper.

**Local progress tracking** (`useProgress`, see §7.5) — no account, stored on your machine:
- Completion model in IndexedDB: `completedTasks: Set<taskId>`, `builtHideoutLevels:
  Set<stationLevelId>`, `playerLevel` — keyed on tarkov.dev IDs.
- "Mark done" toggles on the card's quest/hideout rows → the card shows `Quest — 1 still needed
  (2 done ✓)` and the keep/sell verdict flips to "no longer needed → sell" once nothing's outstanding.
- A **Progress screen** for bulk set-up: quests grouped by trader + hideout modules with check-offs,
  so you can record your existing progress in one pass (start with a flat checklist; prerequisite-aware
  "available now vs locked" via `taskRequirements` + `minPlayerLevel` is an easy refinement).
- **Wipe reset** button (one click clears all progress — see §7.5 for why it's manual).
- **Done when:** typing "ledx"/"gpu" shows quests/hideout/flea at a glance, AND items needed only by
  quests/modules you've marked done drop out — all surviving a reload.

> Scope note: the lookup-card toggles + a flat Progress checklist fit the 2–3 day estimate. The
> fancier prerequisite-aware "need now vs later" view is optional polish that can extend M1 or land
> as a fast-follow — say the word if you want it in scope.

### M2 — Ammo chart (1 day)
- `useAmmo` (bulk fetch + cache).
- Table grouped by caliber with sticky caliber headers; columns: round, pen, damage,
  armor dmg, frag %, (pellets), velocity, accuracy/recoil mod, flea price.
- Sort within/across groups; filter by caliber and a pen/damage range.
- **Color-coded armor effectiveness** per round (see §8).
- **Done when:** caliber-grouped, sortable, color-coded, glanceable at a distance.

### M3 — Interactive maps (1–2 days; highest uncertainty)
- Self-host map SVGs in `public/maps/` (from `the-hideout/tarkov-dev-svg-maps`, CC BY-NC-SA).
- `mapConfigs.ts`: per-map `transform`, `coordinateRotation`, `bounds` copied from tarkov.dev
  `src/data/maps.json`. `crs.ts`: copy `getCRS`/`applyRotation`/`pos` from their MIT `index.jsx`.
- `MapView.tsx`: Leaflet `L.CRS.Simple` + custom transform, `imageOverlay` of the SVG,
  markers from §5.5 query plotted as `[position.z, position.x]` (note the axis swap; ignore `y`).
- Map switcher toolbar. Start with **Customs**, then add maps one config at a time.
- **Fallback** if Leaflet/transform proves heavy: `react-zoom-pan-pinch` over the SVG for
  pan/zoom with no markers (≈20 lines), iterate to markers later.
- **Done when:** at least Customs pans/zooms with extract + spawn pins.

### M4 — Second-monitor polish (½–1 day)
- Global hotkey to focus search (e.g. `/` or `Ctrl+K`); Esc clears.
- Compact/dense layout, large-enough text for across-the-desk glancing, remember last tab.
- PWA manifest + service worker (installable standalone window, offline cache of app shell +
  last item/ammo/map data). See §9.
- Attribution footer + "not affiliated with Battlestate Games" disclaimer (§10).
- **Done when:** installable, opens as its own window, survives a reload offline.

### M5 — Nice-to-haves (backlog)
- Hazards/transits/locks/loot markers on maps; multi-floor layers.
- Barter/craft "best way to obtain" on the item card (`bartersUsing`/`craftsUsing`).
- Pin/favorite items; recent searches.
- PvE vs PvP `gameMode` toggle.

---

## 7. Item lookup — logic detail

**Resolution:** Fuse.js over the cached index returns ranked matches; Enter selects the top hit.
For exact recall, also allow selecting from the dropdown. (Avoid the API's `items(name:)` arg —
it's a fuzzy substring match that can both over- and under-match; local Fuse is better.)

**Badges from data:**
- *Quest:* `usedInTasks` non-empty → badge with count; expand to list `{quest, trader, count, FiR}`
  read from `TaskObjectiveItem` (check both `item` and `items` shapes; read `foundInRaid`).
- *Hideout:* reverse index lookup by item id → `{station, level, count}` rows.
- *Flea:* `avg24hPrice` (headline) + `lastLowPrice` + `changeLast48hPercent`. If null → "Flea banned /
  no offers", show best `sellFor` vendor price instead.

**Keep/Sell heuristic (simple, transparent — not AI):**
```
needed   = usedInTasks.length > 0 || hideoutUses.length > 0
fleaValue = avg24hPrice ?? lastLowPrice ?? 0
bestVendor = max(sellFor.priceRUB)
verdict =
  needed                         → "KEEP — needed for quests/hideout"
  fleaValue >= 30000             → "KEEP — high flea value (~{fleaValue})"
  fleaValue > bestVendor * 1.3   → "SELL ON FLEA (~{fleaValue} vs vendor {bestVendor})"
  else                           → "VENDOR/JUNK (~{bestVendor})"
```
Thresholds are constants in `lib/heuristics.ts` so they're easy to tune.

---

## 7.5 Progress tracking — local completion model

**Why it's cheap:** the lookup already has every quest ID (`item.usedInTasks[].id`) and hideout
station-level ID (`hideoutStations.levels.id`). "Do I still need this?" is just: is that ID in the
user's completed set? So the whole feature is one locally-persisted completion store + set subtraction.

**The model** (stored locally in IndexedDB — no account, no network):
```
progress = {
  completedTasks:      Set<taskId>            // tarkov.dev task ObjectIds
  builtHideoutLevels:  Set<stationLevelId>    // tarkov.dev "<stationId>-<level>" ids
  playerLevel:         number
}
```
Filled two ways, both local: quick "mark done" toggles on the lookup card, and a Progress screen for
bulk check-off (quests by trader + hideout modules). The lookup then subtracts completed IDs so items
you no longer need are dropped or struck through, and the keep/sell verdict updates accordingly.

**Optional refinement:** use `taskRequirements` + `minPlayerLevel` to show only currently-available
quests ("need now") vs locked ones ("need later") — nicer, not required for the core filter.

**Caveats to design around:**
- **Wipes:** EFT wipes reset all in-game progress, and there's no wipe signal in any data — so include a
  manual "reset all progress" button for wipe day. (Game *data* like prices/quests refreshes from the
  API automatically; only your personal check-offs need the manual reset.)
- **PvE vs PvP:** these are separate progressions in-game. v1 tracks a single set; if you play both, a
  simple local profile switcher (two stored sets) is an easy later add — still fully local.

---

## 8. Ammo chart — effectiveness coloring

Group key: `caliber` → friendly label (`Caliber556x45NATO` → "5.56x45mm"). Per-pellet × `projectileCount`
shown for buckshot (`projectileCount > 1`).

**Simple pen tier coloring** (v1) by `penetrationPower`:
| Pen | Tier | Color |
|---|---|---|
| 0–9 | very low | grey |
| 10–19 | low (≈cls 1–2) | red |
| 20–29 | medium (≈cls 3–4) | orange |
| 30–39 | high (≈cls 4–5) | yellow |
| 40–49 | very high (≈cls 5–6) | green |
| 50+ | extreme (cls 6) | teal |

**Optional fidelity upgrade** (later): replicate eft-ammo's "penetration chance vs armor class 1–6"
grid by computing pen-vs-class with the in-game armor formula — more involved, not needed for v1.

Use `accuracyModifier`/`recoilModifier` (Float, e.g. `-0.05`), not the deprecated `accuracy`/`recoil`.

---

## 9. Maps — concrete recipe (verified)

- **Markers** come from the GraphQL API (§5.5); every marker has in-game `position {x, y, z}`.
- **Base image + transform constants** are NOT in the API — they live in tarkov.dev's
  `src/data/maps.json` and the SVG assets. Copy them.
- **Customs example values** (from `maps.json`): `transform: [0.239, 168.65, 0.239, 136.35]`,
  `coordinateRotation: 180`, `bounds: [[698,-307],[-372,237]]`.
- **Plotting:** Leaflet latLng = `[position.z, position.x]` (axis swap!), `y` is elevation (ignore
  for 2D). Apply rotation + `L.Transformation` from the copied `getCRS()`.
- **Assets:** self-host the SVGs from `the-hideout/tarkov-dev-svg-maps` in `/public/maps/` rather
  than hotlinking the CDN. **License: CC BY-NC-SA 4.0** — fine for a personal, non-commercial app;
  attribute "Shebuka / the-hideout"; do not monetize; the repo also forbids cheat/radar/ESP use.
- The transform code (`getCRS`, `applyRotation`, `pos`) is MIT — copy it verbatim.

---

## 10. Legal & safety checklist

- ✅ **Anti-cheat safe:** a second-*monitor* app is a normal separate window/process. BattlEye bans
  process injection / memory reading, not external apps. **Never** read or hook the game process.
- ✅ **Data source:** use the tarkov.dev API, not the CC-BY-SA wiki (avoids attribution/sharealike
  on text). API *code* is GPL-3.0 but you only *call* it — no obligation; a credit link is courtesy.
- ✅ **Map assets:** CC BY-NC-SA 4.0 → keep it non-commercial, attribute, share-alike.
- ✅ **Rate/etiquette:** cache aggressively; never per-keystroke API calls; self-host map SVGs.
- ✅ **Disclaimer:** show "Not affiliated with or endorsed by Battlestate Games"; don't use BSG
  logos/art for branding.

---

## 11. Reserved future upgrades (not v1)

**AI verdict layer.** Add a tiny key-protected backend (Cloudflare Worker / Vercel function) that
holds a Claude Haiku key. Call it ONLY when (a) Fuse has no confident match or the query is clearly
natural language ("the graphics card"), or (b) the user clicks "explain". Pass the already-fetched
structured facts as the only grounding; constrain output to one sentence; cache per item. Keeps p50
latency near-zero and cost negligible. The deterministic v1 already answers the core question, so
this is purely additive — no rework needed.

**Tauri desktop wrapper.** The same React build can be wrapped in Tauri (~10 MB, WebView2) later for
always-on-top, borderless, monitor-persistent window — and, if ever wanted, to embed the *live*
Fandom wiki maps (which a browser can't iframe). No code rewrite; it loads the same app.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| tarkov.dev API downtime (free community service, no SLA) | Cache last-good data in IndexedDB; show "stale data" banner; degrade gracefully |
| Map coordinate transform fiddly per map | Copy exact constants from `maps.json`; ship Customs first; pan/zoom fallback if needed |
| Item index payload size (~MB) | Lean field set; cache in IndexedDB; background refresh |
| Post-wipe data lag | Community updates centrally within days; show data-freshness indicator |
| Flea prices null for banned items | Always fall back to best vendor `sellFor` |
| SmartScreen/install friction | N/A for web/PWA (none) — a reason the web choice is low-friction |

---

## 13. Rough effort

| Milestone | Est. |
|---|---|
| M0 Scaffold | ½ day |
| M1 Item lookup + local progress tracking | 2–3 days |
| M2 Ammo chart | 1 day |
| M3 Maps | 1–2 days |
| M4 Polish + PWA | ½–1 day |
| **v1 total (M0–M4)** | **~5–7 days** of focused work |

M1 + M2 alone (≈3–4 days) already replace most of your browser-tab workflow and are worth shipping
before tackling maps. M1's progress tracking is what makes the lookup answer "do I *still* need this?",
not just "is this ever needed?".
```
