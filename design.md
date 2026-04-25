# Think 'n Go — Design System & Dashboard Wireframe

> Companion to [specs.md](specs.md) and [tasks.md](tasks.md). This file captures the *visual point of view*. No code lives here — code references this for tokens and layout intent.

---

## 1. Concept

**"Institutional trading console with a pulse."**

Think Bloomberg Terminal × TNG corporate identity × FinHack 2026's playful retro-futurism. The dashboard reads as enterprise-grade infrastructure (NYSE control-room calm) but breathes through one focal element: the AI Swarm console on the right, marked by a pulsing yellow heartbeat.

Every other surface is structural and quiet. The swarm is the only thing that *moves*. That contrast is the whole design.

The signature memorable element a judge walks away with: **the yellow SWARM ACTIVE badge throbbing while a dashed agent-flow line crawls down the right rail and a ledger row appears in real time on the left.** Calm + live, in one frame.

## 2. Source DNA

| Source | Extracted into the system |
|---|---|
| TNG eWallet logo | Royal-blue dominance, vivid yellow as accent, italic-bold display weight, white surface, rounded-but-sharp geometry |
| FinHack 2026 keyart | Mustard energy, navy contrast, editorial italic tagline voice ("the future of money needs new minds"), 3D depth as inspiration for layered hover states |
| User reference mock | Sidebar + canvas + swarm-console split, graph-paper background, `SYS.COORD` telemetry detail, monospaced data, yellow "Initiate Swarm" CTA |

## 3. Color system

### 3.1 Tokens

```
/* Surface */
--ink              #0A0E27   /* near-black navy — all primary text */
--paper            #F7F5EE   /* warm off-white — primary surface */
--paper-grid       #EFEDE4   /* faint 24px graph-paper grid */
--stroke           #1D2654   /* 1px hard borders & dividers */
--stroke-soft      #DCDAD0   /* 1px secondary borders */
--muted            #6B7280   /* secondary text */

/* TNG brand */
--tng-blue         #0040A8   /* corporate primary, dominant */
--tng-blue-deep    #002D72   /* hover, depth, active states */
--tng-blue-tint    #E8EFFF   /* tag fills, soft backgrounds */
--tng-yellow       #FFD300   /* THE action color — sparingly */
--tng-yellow-tint  #FFF4B8   /* hover, alert fills */

/* Functional (small doses) */
--up               #00875A   /* gains, "posted" status */
--down             #DE350B   /* alerts, risk windows */
--swarm-glow       rgba(255,211,0,0.35)  /* pulsing aura around active AI */
```

### 3.2 Distribution rule (non-negotiable)

```
65%  paper + ink + strokes      structural calm
20%  TNG blue                    primary actions, links, chart series
10%  muted greys                  secondary type, idle states
 5%  TNG yellow                   AI moments, primary CTA, "live" beats
```

**Yellow only appears on:**
1. The pulsing `SWARM ACTIVE` badge
2. Primary CTAs: `Initiate Swarm`, `Review & Execute`, mobile `Accept`
3. Tool-call status indicator while a call is running (turns blue when settled)
4. The `Release Pending` status pill on the escrow table
5. The single chart "shortfall risk" window highlight

If yellow shows up anywhere else, it's wrong.

## 4. Typography

Three families, each with one job. Get this pairing right and the dashboard already feels expensive.

| Role | Family | Weight | Usage |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700 | Hero numbers, KPI values, h1, h2. Distinctive humanist character — explicitly NOT Inter. |
| Body | **Geist Sans** | 400 / 500 / 600 | All UI labels, table cells, body copy. Already loaded in [layout.tsx](frontend/app/layout.tsx). |
| Mono / data | **JetBrains Mono** | 400 / 500 | Tool call names, hex IDs, ledger amounts in the swarm log, `SYS.COORD`, status pill text, captions. |
| Editorial accent | **Instrument Serif Italic** | 400 | One-time use: hero tagline + arbitrage banner italics. The "human" voice in a sea of telemetry. |

### 4.1 Type scale

```
display-xl   72px / 0.95 / -0.03em    Bricolage 700        (mobile-mock lock-screen time only)
display      48px / 1.00 / -0.02em    Bricolage 700        (KPI values, hero numbers)
h1           32px / 1.10 / -0.015em   Bricolage 700        (page section titles)
h2           22px / 1.20 / -0.01em    Bricolage 700        (card titles)
h3           16px / 1.30              Geist 600            (sub-labels)
body         14px / 1.45              Geist 400            (default)
small        12px / 1.40              Geist 500            (table rows, dense data)
mono         12px / 1.35              JetBrains Mono 500   (tool calls, coordinates)
caption      10px / 1.30 / 0.08em up  Geist 600            (eyebrow labels, status)
italic-quote 18px / 1.35              Instrument Serif 400 italic   (rare, editorial)
```

### 4.2 Numerics

- Always tabular: `font-variant-numeric: tabular-nums slashed-zero`
- Currency uses `RM` prefix, comma thousands, no decimals on KPIs (`RM 145,000`), 2 decimals on ledger rows (`RM 2,450.00`)
- Negative values get a leading `−` (minus sign, not hyphen) in `--down`

## 5. Spatial system

- **8px base unit.** Every padding/margin/gap is a multiple: 8 / 16 / 24 / 32 / 48 / 64.
- **No max-width on the dashboard.** Full-bleed; sidebar 240px fixed, swarm console 380px fixed, canvas fluid.
- **Borders 1px everywhere.** Default `--stroke-soft`, hover/active promotes to `--stroke`. NO drop shadows — except the swarm-glow pulse.
- **Radius 0 by default.** Sharp. 8px on cards. 12px on the SWARM ACTIVE pill. 48px on the mobile phone shell only.
- **Asymmetry on purpose.** Resist the perfect 60/40. The actual ratio is `1.18fr / 0.82fr` for canvas/swarm, and the swarm panel's left border is the only `--tng-blue` divider — making the swarm physically "interrupt" the canvas.

## 6. Background atmosphere

The canvas is **not** flat white. It has texture:

1. **Base:** `--paper` (#F7F5EE — warm cream, like Financial Times newsprint)
2. **Graph-paper grid:** 24px × 24px, `--paper-grid` color, opacity 1, fixed-position so it doesn't scroll
3. **Coordinate telemetry:** `SYS.COORD: 42.109 / -71.058` in the top-right of the chart — a tiny live readout in JetBrains Mono that updates on hover (steal directly from the user mock)
4. **Grain overlay:** SVG noise filter at 4% opacity, layered above paper, below content — adds tactile depth
5. **Swarm panel gradient:** subtle vertical fade from `--paper` to `--tng-blue-tint` to mark it as "the live system"

## 7. Motion language

One orchestrated page-load, then mostly stillness — except for the swarm.

### 7.1 Page-load orchestration (only on first mount)

```
0ms     sidebar fade in
80ms    topbar fade in
160ms   KPI card 1
240ms   KPI card 2
320ms   KPI card 3
400ms   KPI card 4
480ms   chart starts drawing line, left to right, 800ms duration
600ms   swarm panel slides in from right (240ms)
800ms   tool calls cascade in, 60ms each
```

### 7.2 Persistent loops

- **`SWARM ACTIVE` pulse:** scale 1 → 1.04 → 1, box-shadow 0 → 12px `--swarm-glow` → 0, 1.6s ease-in-out infinite. The dashboard's heartbeat.
- **Active connector line:** SVG `stroke-dasharray: 6 6` with `animation: dash 800ms linear infinite` — only on the agent-flow link that is currently routing data.

### 7.3 Interactions

- **Tool call enters:** translateY(-4px) → 0, opacity 0 → 1 over 240ms; mono characters typewriter-reveal at 12ms/char.
- **Stage transition (Advance Demo):** the active flow node rolls vertically like a split-flap display (`transform: rotateX`). Old node tilts back, new tilts in. 320ms ease-out.
- **Table row hover:** background `--paper-grid`, left 2px `--tng-blue` indicator slides in (200ms ease-out).
- **KPI value tick (when stage advances):** counts up with `requestAnimationFrame` over 600ms.
- **Yield slider drag:** offer total recomputes live, no debounce.

No springy bouncy. Everything is crisp `cubic-bezier(0.2, 0.8, 0.2, 1)` — financial-instrument feel.

---

## 8. Wireframe — `/dashboard`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌────────────────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │ TNG TERMINAL │  │  ▮ TERMINAL   Dashboard │ Liquidity │ Forecasts│  │ ● SWARM ACTIVE             │  │
│  │ ─────────────│  │                                ⌕ search   🔔  ◯ │  │   (pulsing yellow pill)    │  │
│  │              │  └────────────────────────────────────────────────┘  └────────────────────────────┘  │
│  │ Human        │                                                                                       │
│  │ Business     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌────────────────────────────┐ │
│  │ Inst. Node   │  │ ESCROW   │ │ LIQUIDITY│ │ ACTIVE   │ │ GO+ YLD  │  │  ┌──────────────────────┐  │ │
│  │              │  │ LOCKED ◐ │ │ AVAILABLE│ │ MSMES    │ │ 30D      │  │  │ Data Ingest          │  │ │
│  │ ◼ Overview   │  │ RM 145K  │ │ RM 37.4K │ │ 128      │ │ RM 1,860 │  │  │ ACME_CORP_API        │  │ │
│  │ ◌ Data Strea │  │ +live ↗  │ │ instant  │ │ +healthy │ │ daily    │  │  └──────────┬───────────┘  │ │
│  │ ◌ Execution  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │             │ ╲╱           │ │
│  │ ◌ AI Console │                                                       │   ┌─────────┴──────────┐    │ │
│  │ ◌ History    │  ┌─────────────────────────────────────────────────┐ │   │ Yield Optimizer    │    │ │
│  │              │  │ Liquidity Projection                            │ │   │ DELTA: +0.6%       │    │ │
│  │              │  │ 30-Day Forward Curve   SYS.COORD: 42.10/-71.06  │ │   │ 1.8% → 2.4%        │    │ │
│  │              │  │                                                 │ │   └─────────┬──────────┘    │ │
│  │              │  │            ╭─────╮                              │ │             │              │ │
│  │              │  │       ╭────╯     ╰────╮                         │ │   ┌─────────┴──────────┐   │ │
│  │              │  │  ─────╯                ╰────────                 │ │   │ ⚡ Execution        │   │ │
│  │              │  │       ▓ shortfall risk window                    │ │   │ READY TO COMMIT    │   │ │
│  │              │  │  ● Base Trend  ● Shortfall Risk                  │ │   │                    │   │ │
│  │              │  └─────────────────────────────────────────────────┘ │   │ [ Initiate Swarm ] │←  │ │
│  │              │                                                       │   └────────────────────┘    │ │
│  │              │  ┌─────────────────────────────────────────────────┐ │                              │ │
│  │              │  │ Escrow Pipeline               View Register →   │ │  ──────── tool log ───────  │ │
│  │              │  │ ─────────────────────────────────────────────── │ │  ◉ 15:42:10 escrow.lock    │ │
│  │              │  │ Merchant      Status         Value     Action   │ │    15:42:14 bnpl.drawdown  │ │
│  │              │  │ Acme Corp     ▭ Net-14 Lck   RM 1.24M  ⋮        │ │    15:42:21 go_plus.yield  │ │
│  │              │  │ Stark Ind.    ▭ Net-30 Esc   RM 850K   ⋮        │ │    15:43:02 discount.offer │ │
│  │ ⚙ Settings   │  │ Wayne Ent.    ▮ Pending ✦    RM 4.10M  ⋮        │ │    15:43:08 escrow.release │ │
│  │ 📖 Docs      │  └─────────────────────────────────────────────────┘ │                              │ │
│  └──────────────┘                                                       │  ─────── slider (P3) ────── │ │
│                   ┌─────────────────────────────────────────────────┐  │  Yield arbitrage           │ │
│                   │ ✦ Arbitrage Opportunity Detected                │  │  ────●─────────  2.4%       │ │
│                   │   2.4% yield differential — release 14d early.  │  │                              │ │
│                   │                              [ Review & Execute ]│  │  ─────── receipt ─────────  │ │
│                   └─────────────────────────────────────────────────┘  │  ✓ ledger 0xa9f… settled    │ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Sidebar (240px, left)

- **Top:** TNG Terminal wordmark — Bricolage 700 14px, ink color, with a 2px `--tng-blue` underline only under the word "Terminal"
- **Tenant identity:** "Human Business / Institutional Node" — caption style, `--muted`
- **Nav rows:** 44px tall, 16px lucide icon, body label, `--muted` color when idle. Active row has a 2px `--tng-blue` left indicator + ink-colored text + `--paper` background lifted by a subtle inset hairline.
- **Nav order:** Overview · Data Streams · Execution · AI Console · History
- **Bottom:** Settings, Documentation (separated by a 1px `--stroke-soft` line)
- **Surface:** `--paper`, right border 1px `--stroke-soft`

### 8.2 Topbar (full-width, sits above canvas + swarm)

- **Left lockup:** small filled `--tng-blue` square (8×8) + JetBrains Mono uppercase "TERMINAL" 12px tracking 0.08em — a deliberate non-logo
- **Center tabs:** Dashboard / Liquidity / Forecasts / Nodes — Geist 500 14px, active tab gets a 2px `--tng-yellow` underline
- **Right cluster:** compact search input (no border, just an underline that focuses to `--tng-blue`), bell icon with a 4px `--tng-yellow` dot, profile avatar circle (28px)
- **Bottom border:** 1px `--stroke-soft`

### 8.3 KPI strip (4 cards, full canvas width)

```
┌─────────────────┐
│ ESCROW LOCKED ◐ │   ← caption JetBrains Mono 10px uppercase + tiny pulsing yellow dot on first card only
│                 │
│ RM 145,000      │   ← Bricolage 48px tabular-nums slashed-zero
│                 │
│ + live ledger ↗ │   ← Geist 12px small label
└─────────────────┘
```
- Sharp corners, 1px `--stroke-soft`, 24px padding, `--paper` background
- Hover: border promotes to `--stroke`, value gets a 1px under-stroke
- Numbers tick when the stage advances (600ms count-up)

### 8.4 Liquidity Projection chart

- Recharts AreaChart, 320px tall
- Two series:
  - Base Trend: solid `--tng-blue` line, soft blue area fill (alpha 0.12)
  - Shortfall Risk: a single vertical band of `--tng-yellow-tint` covering the predicted shortfall window, with a 2px `--down` top edge
- **Top-right corner:** live `SYS.COORD: x.xxx / y.yyy` readout in JetBrains Mono 11px — updates on cursor move via Recharts `<Tooltip>` cursor coordinates
- Grid lines very faint (`--paper-grid`)
- Axis labels JetBrains Mono 10px `--muted`
- Legend: dot + label, top-right beneath SYS.COORD

### 8.5 Escrow Pipeline table

- shadcn `<Table>` with custom skin
- Columns: Merchant Entity / Status & Term / Settlement Value / Action
- **Status pill** (custom component): JetBrains Mono 11px, padding 4×8px, sharp corners
  - `Net-14 Locked` — `--tng-blue-tint` background, `--tng-blue-deep` text, no icon
  - `Net-30 Escrow` — same as Locked
  - `Pending` — `--tng-yellow-tint` background, ink text, ✦ leading icon, soft outer pulse
  - `Posted` — `--up` text, no fill, ✓ leading icon
- Currency right-aligned, tabular numerals, RM prefix
- Action column: 3-dot icon → opens shadcn `<Dialog>` with the "Generate Liquidity" CTA
- Row hover: background `--paper-grid`, left 2px `--tng-blue` slides in 200ms

### 8.6 Arbitrage alert ribbon

- Full-width banner along the bottom of the canvas
- Left: small chart icon in a `--tng-blue-tint` square + Instrument Serif italic title "Arbitrage Opportunity Detected" + Geist body sentence
- Right: `--tng-yellow` "Review & Execute" CTA — Geist 600 14px, ink text, sharp corners, 12px vertical padding
- 1px **dashed** `--tng-blue` top border (the only place we use dashed)

### 8.7 Swarm Command Console (380px, right) — the brand moment

Vertical stack inside `--paper` → `--tng-blue-tint` gradient surface:

1. **`SWARM ACTIVE` badge** — pill, `--tng-yellow` fill, ink text, JetBrains Mono uppercase, pulsing aura via `--swarm-glow`
2. **Agent flow diagram** — three stacked nodes (Data Ingest → Yield Optimizer → Execution) connected by SVG dashed lines. Active link animates `stroke-dashoffset`. Each node is a card with mono name, body subtitle, JetBrains Mono delta value.
3. **`Initiate Swarm` CTA** lives inside the Execution node — yellow, sharp, ink text
4. **Tool call log** — JetBrains Mono list, timestamped. Most recent at top with a `--tng-yellow` ◉ marker; finished calls fade to `--muted` and lose the marker.
5. **Yield arbitrage slider** (Phase 3) — shadcn `<Slider>` restyled: track is `--stroke-soft` with a `--tng-yellow` filled portion, thumb is an 18px ink circle with a 2px yellow ring
6. **Execution receipt** (post-settle) — thin card with `--up` checkmark glyph, ledger row hash in mono, timestamp

The right-panel left border is **`--tng-blue` 1px** (not stroke-soft) — physically marks the swarm as the live system.

---

## 9. Wireframe — `/mobile-mock` (Phase 4 prep)

```
┌─────────────────────┐  ← phone shell, ink exterior, 48px radius
│ ●●●           5G ▮▮ │  ← status bar (mock)
│                     │
│   9:41              │  ← Bricolage 64px, ink
│   Friday, 25 Apr    │  ← Geist 14px, --muted
│                     │
│  ┌───────────────┐  │
│  │ ◉ TNG         │  │  ← notification card
│  │ Wholesaler    │  │     backdrop-blur(20px) + --tng-blue at α 0.85
│  │ offer:        │  │     white text
│  │ 2% discount   │  │
│  │ to release    │  │
│  │ escrow today? │  │
│  │               │  │
│  │ [  Decline  ] │  │  ← outlined, white text on transparent
│  │ [   Accept  ] │  │  ← --tng-yellow fill, ink text — only yellow on screen
│  └───────────────┘  │
│                     │
│        ▬▬▬▬▬        │  ← home indicator, white at α 0.5
└─────────────────────┘
```

- Phone shell: `--ink` exterior, `--paper` inner screen
- Lock-screen background: subtle vertical gradient from `--paper` → `--tng-blue-tint`
- Notification card: `backdrop-filter: blur(20px)`, `--tng-blue` at alpha 0.85, white type — the iOS frosted look
- Accept button is the **only** `--tng-yellow` element on this screen — it's the demo moment

## 10. Component inventory

| Component | Source | Notes |
|---|---|---|
| Layout shell, sidebar | hand-built | Too specific for shadcn |
| Topbar tabs | shadcn `Tabs` | Restyled with yellow underline |
| Search input | shadcn `Input` | Underline-only variant |
| KPI cards | hand-built | Just divs + Bricolage type |
| Liquidity chart | Recharts `AreaChart` | Custom Tooltip with SYS.COORD |
| Escrow table | shadcn `Table` | Restyled rows |
| Status pill | hand-built | Mono font, blue/yellow/green tints |
| Action dialog | shadcn `Dialog` | Generate Liquidity confirm |
| Arbitrage banner | hand-built | One-off |
| Swarm badge (pulse) | hand-built + Motion | Signature element |
| Agent flow nodes | hand-built SVG | Dashed-line stroke animation |
| Tool call list | hand-built | Mono terminal feel |
| Yield slider (Phase 3) | shadcn `Slider` | Restyled track in yellow |
| Tooltip on hover | shadcn `Tooltip` | Coordinate readouts |
| Generative AI prompt box | **21st.dev** | Grab one in Phase 3 |
| Animated status node | **Kokonut UI** | Grab in Phase 3 if better than ours |

## 11. Open decisions (lock these before Phase 2 build)

1. **Currency:** RM (Ringgit) only per specs. The reference mock shows USD ($) — switch to RM throughout.
2. **Sidebar nav labels:** Keep mock's "Overview / Data Streams / Execution / AI Console / History" — already polished, reads enterprise. Don't rename.
3. **Display font:** **Bricolage Grotesque** (free on Google Fonts). If you'd rather PP Neue Machina or Söhne (paid), swap before build starts.
4. **Editorial italic font:** **Instrument Serif** (free on Google Fonts) — used sparingly on 2–3 strings only.
5. **Logo treatment in sidebar:** Pure type ("TNG TERMINAL") matches the mock. Confirm — alternative is a small geometric mark.
6. **Dark mode:** Not in scope for hackathon. Confirmed?
7. **Motion library:** Add `motion` (formerly Framer Motion) for the swarm pulse + stage transitions, OR do everything in CSS keyframes? Motion gives us spring-free orchestration with `staggerChildren`; CSS is lighter. My pick: install `motion` — payback is the orchestrated load.

## 12. What this design deliberately rejects

- ❌ Purple-to-blue gradients (the AI cliché)
- ❌ Glassmorphism everywhere (only on the mobile notification card, where it earns its keep)
- ❌ Inter font (overused; Geist already fills the slot)
- ❌ Soft drop shadows (we use 1px hairlines + the swarm glow only)
- ❌ Neon colors and dark-mode-by-default (we are warm cream institutional, not Vercel-clone dark)
- ❌ Symmetric 60/40 splits (we use 1.18 / 0.82)
- ❌ Springy bouncy animations (financial UI; everything ease-in-out)
- ❌ Emoji icons in the data layer (lucide line icons only; emoji reserved for the mobile notification body if at all)
