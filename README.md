# Décor Studio

Canvas-first design **and** quoting platform for building-finishing trades in
Algeria. Flagship module: the **Faux-Plafond Designer**. Architecture is one
canvas engine that hosts many trade modules — Faux-Plafond ships first, with
Paint, Decorative Wall, and Floor-Plan-to-Devis on the roadmap.

One design produces **two outputs**:

1. **Client Proposal** — a rendered visualization + a single big price. Sells the job.
2. **Worker Technical Plan** — dimensioned layout + cut list + shopping list. Builds the job.

## What's in this repo

```
src/
├─ canvas/                Konva-based canvas engine (stage, snapping, viewport)
├─ modules/faux-plafond/  Library, defaults, calculation engine
├─ store/                 Zustand stores + Dexie (IndexedDB) persistence + sync queue
├─ pdf/                   jsPDF client proposal + worker plan generators
├─ components/            Toolbar, library tray, properties, cost panel, mobile sheet
├─ i18n/                  FR / AR (RTL) / EN
├─ utils/                 Units (cm/m/ml/m²), Algerian fiscal (TVA 19%, timbre), ULID
└─ App.tsx                Responsive shell + autosave glue
```

## Stack

- **React 19 + TypeScript + Vite**
- **Konva.js / react-konva** for the canvas (touch gestures, transformer, layer caching)
- **Zustand + Immer** for state with bounded undo/redo (60 steps)
- **Dexie** (IndexedDB) for offline-first design persistence + sync queue
- **jsPDF** for client-side PDF generation (works fully offline)
- **i18next** for FR / AR (RTL) / EN
- **vite-plugin-pwa** + Workbox service worker (offline shell)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview
```

`npm run typecheck` runs `tsc --noEmit` in strict mode.

## Mobile-first, touch-first

Primary device is a cheap Android phone on a job site. The canvas implements:

- **One finger empty** → pan; **one finger on object** → drag the object
- **Two fingers** → pinch-zoom + pan; pointer-anchored so the zoom centers where the fingers are
- **Tap empty** → deselect; **tap object** → select; transformer handles are oversized (≥ 44 px hit area)
- **Snap** to room edges, centerlines, grid (10 cm), and other objects' edges/centers
- **Generous threshold** (8 cm in world units) to forgive dusty fingers and cracked screens
- **Forgiving in-room clamping** so objects can't be dragged outside the room
- **`touch-action: none`** on the stage so the browser doesn't fight gestures
- **Big visible undo/redo** in the toolbar; bounded 60-step history
- Bottom-sheet versions of every panel below 640 px so Cost / Library / Properties stay one-tap away

## Offline-first

- Service worker pre-caches the app shell + module assets
- Every committed canvas action autosaves to IndexedDB (debounced 500 ms)
- A `sync_queue` table holds pending mutations for last-write-wins server sync
- License gating has a 7-day offline grace so a dropped signal can never lock a contractor out mid-job

## Faux-Plafond calculation engine

The engine derives quantities from canvas geometry. Ratios and prices are
tenant-overridable defaults — the contractor tunes them once.

- Plaque BA13 (1.20 × 2.50 m, 3 m²/plaque) with configurable waste %
- Fourrure F530 (~2.7 ml/m²), suspentes (~1.4/m²), screws (~20/m²)
- Perimeter cornière (room perimeter + retombée perimeters)
- Joint band + enduit derived from area
- Decorative lines computed per placed object: corniche by linear m, rosace by count,
  spot grids by rows × cols, LED strip by polyline length, retombée by dropped area
  + vertical face area (perimeter × drop)
- Spotlight transformers (1 / 6 spots) and LED drivers (1 / 5 ml)
- Pricing: materials + labor → TVA 19 % → droit de timbre (cash only, 1 % capped at 10 000 DA) → TTC

All quantities are rounded UP to purchasable units; raw and rounded are both kept
so the worker PDF can show both. Margin % is computed against an internal cost
basis and **never printed on the client PDF**.

## Multi-tenancy & licensing

- Each contractor is a tenant with their own branding, price catalog, language, RC/NIF/NIS/AI
- License has an expiry timestamp + a manual license-key entry; client-side enforcement degrades gracefully with a 7-day offline grace window
- "Mode chantier" (outdoor / high-contrast) toggle for direct-sunlight readability

## Lead magnet

- **Quick Calculator** is a form-only modal (no canvas) — type room dimensions, toggle perimeter corniche / central rosace, set spot count and LED length, get full materials + price live. "Open in designer" promotes to the canvas with the room pre-sized.

## In-app actions

- **Long-press** an object (or right-click on desktop) opens a touch-friendly context menu: duplicate, lock/unlock, bring forward, send backward, delete.
- **Convert to invoice**: assigns the next sequential per-tenant invoice number `YYYY-NNNNN`, stamps the design as `invoiced`, and the client PDF switches from "Proposition" to "Facture {number}".
- **WhatsApp share**: after a PDF export, a toast surfaces a `wa.me` deep link with the client phone + quote summary + total pre-filled.
- **Designs**: a 📂 button opens a saved-designs list (loaded from IndexedDB) so the contractor can reopen any past job.
- **Sample design**: empty-canvas CTA loads a realistic salon (perimeter LED corniche + central rosace + 2 × 4 spot grid + LED tray polyline).

## Roadmap

- Paint / Room Color Visualizer (photo upload + mask wall + repaint)
- Decorative Wall / Moulure Designer (wall elevation + symmetry helpers)
- Floor-Plan-to-Devis (whole apartment, all finishes)
- Server-side high-fidelity PDF rendering (Laravel) as alternate path
- Custom asset uploads per tenant
- Portfolio sub-pages (per-tenant landing page with WhatsApp quote button)

## File map

```
src/
├─ App.tsx                              app shell + autosave + capture orchestration
├─ canvas/
│  ├─ Stage.tsx                         Konva stage + transformer + dims + gestures
│  ├─ snapping.ts                       edge/centerline/grid/other-object snapping
│  └─ viewport.ts                       container size + fit-to-room math
├─ modules/faux-plafond/
│  ├─ library.ts                        9 modules (corniche, rosace, spots, LED, retombée, …)
│  ├─ defaults.ts                       Algerian baseline catalog + ratios (waste, F530, etc.)
│  ├─ calculations.ts                   geometry → materials + decorative + totals
│  └─ sample.ts                         representative salon for the empty-state CTA
├─ store/
│  ├─ canvasStore.ts                    Zustand + Immer + 60-step undo/redo
│  ├─ db.ts                             Dexie (designs/tenants/sync_queue) + invoice numbering
│  └─ tenantStore.ts                    active tenant + license grace
├─ pdf/
│  ├─ clientProposal.ts                 hero render + total (devis OR facture)
│  ├─ workerTechnical.ts                dimensioned plan + shopping list
│  └─ branding.ts                       header / footer / legal block
├─ components/
│  ├─ Toolbar.tsx                       new/open/calc/undo/redo/export/invoice/lang/⚙
│  ├─ LibraryTray.tsx                   categorized module picker
│  ├─ PropertiesPanel.tsx               room + selected-object editor + corniche sides
│  ├─ CostPanel.tsx                     live totals + line items + options + client
│  ├─ MobileBottomSheet.tsx             single tabbed sheet (cost/library/properties)
│  ├─ ContextMenu.tsx                   long-press / right-click object actions
│  ├─ DesignsModal.tsx                  load/delete saved designs
│  ├─ SettingsModal.tsx                 tenant branding + legal + license + outdoor mode
│  ├─ QuickCalculator.tsx               form-only lead-magnet calculator
│  └─ ShareToast.tsx                    post-export wa.me deep link
├─ i18n/                                fr, ar, en
├─ utils/                               units (cm/m/ml/m²/DZD), fiscal (TVA/timbre), ULID
└─ types/index.ts                       Design / PlacedObject / Tenant / Totals
```
