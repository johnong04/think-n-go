# Think 'n Go — Task Flow

Hackathon execution plan derived from [specs.md](specs.md). Frontend-first, demo-first. Mark items `[x]` as soon as a milestone is shippable on screen — don't wait for polish. Add a one-line note under each completed item with **what's now demo-able** so the next agent (or teammate) can pick up cold.

**Status legend**
- `[ ]` not started
- `[~]` in progress
- `[x]` done & verifiable in browser
- `[skip]` consciously deferred (write why)

**Workflow rule:** before starting work, read this file top-to-bottom. After finishing any item, update its status here in the same commit as the code change. If you discover a new must-do that isn't listed, add it under the right phase.

---

## Phase 0 — Frontend foundation (unblocks everything)

- [x] **0.1** Install Tailwind v4 + PostCSS in `frontend/`
  - Installed `tailwindcss@^4.2.4` + `@tailwindcss/postcss`. Created `postcss.config.mjs`. Prepended `@import "tailwindcss"` to [globals.css](frontend/app/globals.css). Tailwind v4 coexists with existing raw CSS — no migration needed.
- [x] **0.2** Clean slate — wipe all mock UI
  - Removed all demo arrays, hardcoded data, and custom CSS classes from page.tsx and globals.css. Blank placeholder page at `/`. globals.css now only has Tailwind imports + shadcn variables.
- [x] **0.3** Initialize shadcn/ui
  - `npx shadcn@latest init -d` (New York style, zinc base, CSS variables). Created `components.json`, `lib/utils.ts`. Added `button`, `card`, `table`, `badge`, `tabs`, `progress`, `slider`, `dialog`, `tooltip` into `frontend/components/ui/`. Path alias `@/*` added to `tsconfig.json`.
- [x] **0.4** Install `recharts` for the Liquidity Health chart
  - `npm install recharts`. Ready to use in Phase 2.
- **Note — 21st.dev & Kokonut UI:** These are copy-paste registries, not npm packages. No install step. Grab components from their sites when building the Swarm Console in Phase 3.

## Phase 1 — Route split (matches specs §4)

- [x] **1.1** Create `app/dashboard/page.tsx`
  - Blank placeholder. Root `/` now redirects to `/dashboard` via `next/navigation`.
- [x] **1.2** Create `app/mobile-mock/page.tsx` with a device-bezel shell
  - Fixed 390×844px white rounded container on a neutral background. Empty body — push-notification UI in Phase 4.
- [x] **1.3** Add `app/mobile-mock/layout.tsx`
  - Isolated layout so no global chrome bleeds into the phone frame.
- [skip] **1.4** Document split-window demo URL — obvious from route names; not worth a doc entry yet.

## Phase 2 — Dashboard "Business Stage" zone (left 60%)

- [x] **2.1** Liquidity Health Chart
  - Recharts AreaChart, two series (Base Trend + Shortfall Risk), animated draw, SYS.COORD live readout in top-right updates on cursor hover via `onMouseMove` + `activePayload`.
- [x] **2.2** Escrow Pipeline Table (shadcn `data-table`)
  - shadcn Table, custom StatusPill (Net-14/Net-30/Release Pending/Posted), hover blue-line slide-in on left edge; 5 mock rows.
- [x] **2.3** Top status grid (escrow locked, liquidity available, active MSMEs, GO+ yield)
  - 4 KPI cards with motion staggered entry (0.16s + 80ms/card); first card has live pulsing yellow dot.
- [x] **2.4** Mode switch (merchant / wholesaler — two modes only, no unified)
  - merchant/wholesaler segmented control in topbar; arbitrage banner body copy reacts to mode; default merchant.
- [x] **2.5** Data source plan
  - All data centralized in `lib/mock-data.ts` (typed: Mode, Kpi, EscrowRow, EscrowStatus, ChartPoint); components consume props; ready to swap to Supabase in Phase 6 by replacing one import.

## Phase 3 — Dashboard "Swarm Command Console" zone (right 40%)

- [x] **3.1** Vertical stack of Generative UI cards
  - Vertical AgentFlow (3 nodes Data Ingest → Yield Optimizer → Execution) with motion-driven state transitions and tool log streaming entries phase-by-phase.
- [x] **3.2** Pull 2–3 components from Kokonut UI / 21st.dev for the AI motif
  - Vendored Kokonut UI: ai-text-loading (tool log streaming text), ai-state-loading (active node reasoning indicator), beams-background (atmospheric backdrop in TNG blue/yellow at 14% opacity).
- [x] **3.3** Yield arbitrage slider (interactive)
  - shadcn Slider restyled with yellow track + ink thumb; live delta readout shows RM offer total against base RM 2,450.
- [x] **3.4** Execution receipt card
  - ExecutionReceipt slides in on settled phase: ledger hash 0xa9f3b8e21c, discount %, net-to-wholesaler in display font, green success ring.
- [ ] **3.5** Predictive Liquidation Targeting — Wholesaler AI tool (specs §6.2)
  - Replace static rule-based targeting with the `evaluate_network_liquidity()` tool. The Wholesaler agent uses real-time signals to choose *which* merchant to target, not a hardcoded list.
  - **Anonymized QR Velocity:** queries the TNG backend for live DuitNow QR transaction velocity across all merchants holding locked escrows. Raw merchant data never reaches the wholesaler.
  - **Selection Logic:** strictly targets merchants with high transaction volume (proxy for strong cash flow + ability to accept early settlement). Skips low-velocity merchants even if their escrow is large.
  - **Adversarial Negotiation:** if the Wholesaler AI proposes a mathematically inferior discount to a highly liquid merchant, the receiving Merchant AI rejects the payload AND returns a sharp, math-based roast that surfaces on the Wholesaler's dashboard UI ("offer is RM X below the 14-day GO+ yield, declined"). This is a visible feedback loop, not silent rejection.
  - Slots into the existing AgentFlow as a tool node on the Wholesaler agent (between `scan_escrow_ledger` and `calculate_discount_offer`). Roast surfaces in the swarm console as a new "rejection" log entry + a banner on the canvas.

## Phase 4 — Mobile push experience

- [x] **4.1** Static notification component on `/mobile-mock`
  - Mobile mock at `/mobile-mock` shows full TNG eWallet styling (blue body, white cards, yellow tab underline, pill buttons). 7 screens across merchant (4) + wholesaler (3) flows from specs §6, click-driven with realistic mock data (Ahmad / Hartono / ESC-7142 / RM 1,000 Net-14).
- [x] **4.2** Accept / Decline buttons — local state only, no backend yet
  - Accept/Decline buttons on merchant offer screen and Send Offer / awaiting transitions on wholesaler side. All click handlers publish to `useDemoBus()` so the dashboard can subscribe in Phase 5/6.
- [x] **4.3** Wire to the dashboard via WebSocket (Supabase Realtime in Phase 6) OR a temporary BroadcastChannel for same-browser demo
  - BroadcastChannel `think-n-go-bus` wired via `lib/demo-bus.ts`. Single hook `useDemoBus(handler)` for subscribers, `publish(event)` for emitters. Same-origin only — both phone and dashboard share `localhost:3000`. Swap target for Supabase Realtime is internal to the hook.
- [ ] **4.4** Treasury Impact Dashboard — persistent component on Ahmad's mobile (specs §6.1)
  - A persistent "Treasury Impact" surface visible on the merchant mobile route (likely as a tab on M1 Home or a dedicated screen reachable from the wallet card). Dynamic data viz, not a static badge.
  - **Cumulative Yield Retained:** total GO+ interest earned across all of Ahmad's Net-14 escrows (running sum, formatted as `RM X.XX` with subtle daily tick animation). Sources from the same mock dataset that feeds the dashboard's GO+ yield KPI in Phase 2.
  - **BNPL Revenue Multiplier:** calculated metric showing estimated extra revenue Ahmad generated from inventory bought *exclusively* via the AI-underwritten BNPL facility. Display as a multiplier (e.g., `1.42×`) plus the implied RM uplift. Mock formula: `(BNPL-funded inventory turnover × avg margin) ÷ baseline cash-only revenue`.
  - Visual style follows the existing TNG cards (white floating on tng-blue-app body, Bricolage display numbers, tabular-nums). Numbers tick when new escrow events fire on the demo bus.

## Phase 5 — AI orchestration (Vercel AI SDK v6)

- [ ] **5.1** Add an API route `app/api/agent/route.ts` using `streamText` + `tool()`
  - Tools to scaffold (mocked outputs OK initially, see [page.tsx:37-44](frontend/app/page.tsx#L37-L44) for names):
    - `analyze_qr_velocity`
    - `forecast_stockout`
    - `calculate_bnpl_shortfall`
    - `lock_escrow`
    - `compute_yield_arbitrage`
    - `release_payment`
- [ ] **5.2** Wire `useChat` in the Swarm Console; render granular tool states (`input-streaming`, `input-available`, `output-available`)
- [ ] **5.3** Decide LLM provider:
  - **Option A (fast):** OpenAI via `@ai-sdk/openai` — works out of the box.
  - **Option B (judges-friendly):** AWS Bedrock through the existing FastAPI backend [backend/app/routers/bedrock.py](backend/app/routers/bedrock.py). Adds latency but matches the Malaysian-cloud story.
  - Pick A first to ship, swap to B if there's time.
- [ ] **5.4** Connect "Advance Demo" button [page.tsx:155](frontend/app/page.tsx#L155) to fire one tool call per stage instead of incrementing state locally

## Phase 6 — Backend ledger (Supabase)

- [ ] **6.1** Provision a Supabase project; commit only the URL + anon key to `.env.local` (never to git)
- [ ] **6.2** Schema:
  - `merchants(id, name, qr_velocity_30d, health_score)`
  - `wholesalers(id, name)`
  - `escrows(id, merchant_id, wholesaler_id, amount, status, locked_at, released_at)`
  - `ledger_entries(id, escrow_id, event, account, amount_minor, status, created_at)` — minor units (sen) to avoid float drift.
- [ ] **6.3** Atomic lock & release as Postgres functions (`plpgsql`) — single transaction, double-entry inserts.
- [ ] **6.4** Subscribe `/mobile-mock` to Realtime on the `escrows` row for the active merchant; fire a notification on `status='offer_pending'`.
- [ ] **6.5** Replace the hard-coded `ledgerRows` in [page.tsx:46-52](frontend/app/page.tsx#L46-L52) with a live Supabase query streamed into the dashboard.

## Phase 7 — Demo polish

- [ ] **7.1** Pulsing yellow indicator any time the AI is "reasoning" (specs §4.3)
- [ ] **7.2** Stage transitions animated (Framer Motion or CSS keyframes — pick one, don't mix)
- [ ] **7.3** Run-through script: 90-second demo, no clicks miss
- [ ] **7.4** Record a fallback screen capture in case live demo network fails — drop to `frontend/public/demo-fallback.mp4`
- [ ] **7.5** Set Next.js metadata (title, OG image, favicon) — judges will glance at the tab

## Explicitly NOT doing (hackathon scope)

These are listed so a future agent doesn't waste time on them:

- **No unit tests, no e2e tests.** Verify by clicking through the demo.
- **No auth.** Single hard-coded merchant + wholesaler. No login screen.
- **No production hardening:** rate limiting, CSRF, input fuzzing, OWASP top-10 checks. Skip.
- **No CI/CD.** Manual `npm run dev` + `uvicorn` is the deploy.
- **No multi-tenant isolation.** One Supabase project, one demo dataset.
- **No mobile responsiveness beyond the `/mobile-mock` route.** Dashboard targets a 1440px+ judging screen.
- **No accessibility audit.** Keyboard tab order is fine, screen-reader pass is not in scope.
- **No i18n.** English + RM currency only.

---

## Project intelligence log

Append-only. When you finish a milestone or learn something a fresh-context agent would want to know, add a dated bullet below. Keep entries one to three lines. Newest entries on top.

<!-- format:
- **YYYY-MM-DD** — what changed / what was learned. (author or agent name)
-->

- **2026-04-26** — Phase 4 done. `/mobile-mock` is a 390×844 phone shell on TNG-blue (`--tng-blue-app: #1A5FE0`) with a `MERCHANT | WHOLESALER` toggle. Merchant: M1 AI alert → M2 QR scan (auto-advances after 1.8s) → M3 smart contract review (own RM 500 + BNPL RM 500 split bar) → M4 push notification offer (overlay style). Wholesaler: W1 client list (5 mock rows) → W2 liquidation slider (1.0–5.0% discount) → W3 awaiting → settled. Cross-window plumbing: BroadcastChannel `think-n-go-bus`. `wholesaler:offer-sent` triggers M4 to surface even if dispatched from another window (cross-persona demo). Dashboard subscribes in Phase 5+. Two new CSS tokens: `--tng-blue-app` (mobile body), `--tng-red` (QR card brand accent). NO real backend, NO AI calls; everything is `setTimeout` + `useState`. (Claude)
- **2026-04-25** — Phase 3 done. Right rail now hosts the SwarmConsole orchestrator: SwarmBadge (active/settled state) → AgentFlow (3 nodes + animated SVG dashed connectors) → ToolLog (5 entries streamed across 4 phases) → YieldSlider (1.8%–4.0%, locked while running) → ExecutionReceipt (post-settle). State machine in `lib/swarm-machine.ts`, total run 5s. Vendored 3 Kokonut UI components as inline fallbacks into `components/ui/` (install URLs hit Pro/404 so inline implementations were used instead of shadcn registry). Initiate Swarm CTA inside the Execution node, doubles as Reset after settled. Skipped 21st.dev "Agent Plan" — hand-rolled SVG flow stayed truer to our blue/yellow palette. Wiring to Vercel AI SDK v6 is Phase 5; the ToolLog and AgentFlow already key off a `phase` prop, so swap-in is single-source. Slider uses `@base-ui/react` (not Radix); `onValueChange` receives `readonly number[]` so cast required in yield-slider.tsx. (Claude)
- **2026-04-25** — Phase 2 done. Dashboard at `/dashboard` renders sidebar + topbar (with merchant/wholesaler mode switch) + KPI strip + Liquidity chart (recharts, animated, SYS.COORD telemetry via onMouseMove/activePayload) + Escrow table (5 rows, status pills) + arbitrage banner (mode-aware copy) + swarm placeholder (right column). Brand tokens applied per design.md §3, fonts loaded (Bricolage / JetBrains Mono / Instrument Serif / Geist) via next/font. `motion` library installed. Mock data centralized in `lib/mock-data.ts` — swap point for Supabase in Phase 6. ESLint flat config added (`eslint.config.mjs`) because Next.js 16 dropped `next lint` subcommand; lint script updated to `eslint app components lib`. (Claude)
- **2026-04-25** — Phase 1 done. Routes live: `/` → redirects to `/dashboard`; `/dashboard` and `/mobile-mock` both resolve. Mobile mock has an isolated layout (no global chrome). TypeScript clean. (Claude)
- **2026-04-25** — Clean slate. Wiped all mock UI and custom CSS from page.tsx and globals.css. globals.css now contains only Tailwind v4 imports + shadcn's generated variables + `body { margin: 0 }`. page.tsx is a blank placeholder. All infra intact: layout.tsx (Geist font), components/ui/*, lib/utils.ts, postcss.config.mjs, components.json, tsconfig paths. TypeScript compiles clean. Ready for Phase 1 design work. (Claude)
- **2026-04-25** — Phase 0 complete (0.1, 0.3, 0.5; 0.2 skipped intentionally; 0.4 still open). Tailwind v4 + PostCSS wired, shadcn initialized (New York/zinc), recharts installed. `frontend/components/ui/` now has: button, card, table, badge, tabs, progress, slider, dialog, tooltip. `tsconfig.json` has `@/*` path alias. **`--muted` CSS variable conflict** between our gray text token (`#68717f`) and shadcn's muted-bg (`oklch(0.97)`) — resolved by keeping ours and adding `--muted-bg`; will need proper palette pass in 0.4. Demo page at `/` still fully clickable. (Claude)
- **2026-04-25** — tasks.md created. Repo state: single-page demo at `/`, no Tailwind/shadcn/Supabase yet, AWS Bedrock backend scaffolded but not called from frontend. AI SDK v6 + Zod pinned in [frontend/package.json](frontend/package.json) but not yet installed (`npm install` pending). (Claude)
