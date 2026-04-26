# Real Agentic Demo — Design

**Date:** 2026-04-26
**Branch:** `john-frontend`
**Status:** design — awaiting user review before plan

## Goal

Make the existing two-scenario demo (B then A, chained) tell a real, coherent ayam-gepuk-merchant story end-to-end across three UI surfaces: the wholesaler **Invoice page**, Ahmad's **Mobile**, and the wholesaler **Dashboard**. Replace hardcoded mock numbers with live RDS reads, real Bedrock reasoning streamed into the tool log, and a single hidden one-click reset to a deterministic baseline.

## Non-goals

- Real Bedrock SSE streaming (we fake-stream pre-generated text)
- Vercel AI SDK integration
- Auth, multi-tenant, mobile responsiveness
- Wiring KPI cards 3 (ACTIVE MSMES) and 4 (GO+ YIELD 30D) to live aggregates
- Wiring the dashboard liquidity recharts chart to live data
- E2e or unit tests

## The story (chronological, three surfaces)

The demo is one continuous ~90-second narrative spanning three browser surfaces. Reset returns DB to baseline.

### Setup (before judges arrive)

Operator hits the hidden `[reset]` link in the dashboard footer. Backend wipes & re-seeds:

- **1 wholesaler** "Pasar Borong Ahmad Trading" — wallet RM 37,400.
- **5 merchants:** Ahmad bin Yusof (Ayam Gepuk Mak Cik, Setapak), Siti Norhaliza (Mart Wangsa), Tan Mei Ling (Café Hang Tuah), Mohd Faisal (Toko Buah Pasar Borong), Rajesh Kumar (Kedai Runcit Sentral).
- **4 historical contracts** giving baseline KPIs:
  - Siti — RM 2,400 LOCKED NET-14 (in flight, 11 days in)
  - Mohd Faisal — RM 3,200 LOCKED NET-30 (2 days in)
  - Tan Mei Ling — RM 1,820 SETTLED yesterday
  - Rajesh — RM 540 SETTLED last week
- **No active contract for Ahmad** — that's what the demo creates.

KPIs at baseline:
- ESCROW LOCKED = RM 5,600 (Siti + Faisal)
- LIQUIDITY AVAILABLE = RM 37,400 (wholesaler wallet)
- ACTIVE MSMES = 128 (static)
- GO+ YIELD 30D = RM 1,860 (static)

### Act 1 — Invoice page (wholesaler creates invoice)

URL: `/invoice-demo`. Wholesaler types: *"1000 ayam segar @ RM1.00 each, NET-14, deliver to Ahmad bin Yusof Ayam Gepuk Mak Cik Setapak"*. Frontend calls `POST /invoice/draft` (Bedrock) → structured invoice returned. Wholesaler reviews, optionally calls `POST /invoice/revise` to tweak. On confirm, frontend publishes `invoice:draft-updated` bus event with the full `InvoiceDraft` payload + persists to localStorage so cross-window survives refresh.

Concrete invoice:
- INV-2026-0512, RM 1,000 total, NET-14, supplier "Pasar Borong Ahmad Trading," receiver "Ahmad bin Yusof / Ayam Gepuk Mak Cik."

### Act 2 — Mobile (Ahmad receives + acts on BNPL)

URL: `/mobile-mock`. On load, mobile already calls `/msme/demand-pressure/mock?current_balance_rm=760` → `/msme/demand-pressure/insight`. Bedrock-generated insight streams into M1 alert: *"Your ayam gepuk velocity is up 18% week-over-week. A similar large payment usually happens about every 12 days — it's been 11 days."*

Mobile picks up `invoice:draft-updated` from Act 1 → contract preview now uses real invoice numbers (RM 1,000, supplier name, items list).

Ahmad taps **"Fund Order"** → mobile transitions through M2 scan → M3 contract review showing:
- Items: 1000 × Ayam segar @ RM 1.00 = RM 1,000
- Cash on hand: RM 500
- BNPL needed: RM 500
- Repayment: ~RM 3.57/day for ~14 days via QR sweep
- Bedrock-generated reasoning streams into a new "AI Underwriting" panel: *"Approved. 30-day QR velocity RM 18,400 — repayment is 1.4% of daily flow. Credit score 720, healthy."*

Ahmad taps **"Lock Escrow"** → frontend calls `POST /agent/merchant/request-underwriting` (which calls `fn_mint_bnpl_escrow` → DB row inserted with status `FUNDED_INVESTED`, RM 1,000 principal). Returns the new contract ID.

Mobile publishes `merchant:escrow-locked` with real contract ID.

### Act 3 — Dashboard reacts to lock

`/dashboard` is open in another window. KPI strip subscribes to `merchant:escrow-locked` → calls `GET /dashboard/kpis` → ESCROW LOCKED ticks **RM 5,600 → RM 6,600** with a brief flash. Escrow table refreshes via `GET /contracts/?status=FUNDED_INVESTED` → Ahmad's row appears at the top.

ShortfallAlert is in `open` state showing "Cash Shortfall RM 800 today."

### Act 4 — Dashboard initiates liquidation (Scenario A)

Wholesaler clicks **"Generate Instant Liquidity"** on ShortfallAlert. Publishes `wholesaler:liquidation-triggered`. SwarmConsole picks up the event → scenario A starts.

**Phase t1 — `scan_escrow_ledger`** (wholesaler agent)
- Frontend: `GET /contracts/?status=FUNDED_INVESTED&min_amount=1000` → returns Siti, Mohd Faisal, Ahmad.
- Backend reasoning text (Bedrock): *"3 active escrows reviewed. Skipping Siti (cycle past peak), Mohd Faisal (NET-30, only 2 days in). Ahmad's NET-14 at day 0 is liquid-ready, his QR velocity RM 18,400/30d signals high acceptance probability."*
- Tool log streams the reasoning char-by-char.

**Phase t2 — `calculate_discount_offer`**
- Frontend: `POST /agent/supplier/optimize-discount` `{shortfall_rm: 800, contract_id: ahmad_id}` → returns `{optimal_pct: 2.0, discount_rm: 20, reasoning_text: "..."}`.
- Backend reasoning text (Bedrock): *"At 2.0% discount, RM 20 nets RM 980 to wholesaler — covers RM 800 shortfall plus RM 180 buffer. Below 1.5% the deal is unlikely to entice; above 2.5% wastes margin."*

**Phase t3 — `transmit_offer_payload`**
- Frontend publishes `wholesaler:offer-sent` `{contractId, discountPct: 2.0}` → mobile transitions to M4 offer screen.

### Act 5 — Mobile (Ahmad evaluates + accepts)

Mobile's M4 offer screen shows:
- "Wholesaler offers RM 20 (2.0%) discount for early release"
- AI thinking spinner (~1.2s while frontend calls `POST /agent/merchant/audit-arbitrage` `{contract_id, discount_rate: 0.02}`)
- Backend returns `{decision: "ACCEPT", net_gain_rm: 18.50, reasoning_text: "..."}`. Bedrock reasoning streams into a "Yield arbitrage" panel: *"You earn ~RM 1.50 holding 14 days at 4% APY. Accepting RM 20 discount nets +RM 18.50. Recommendation: ACCEPT."*

Ahmad taps **"Accept"** → frontend publishes `merchant:offer-accepted`.

### Act 6 — Dashboard executes settlement (Scenario A finishes)

**Phase t4 — `evaluate_arbitrage_logic`** (visualization redundant — reasoning text from Act 5 is replayed in tool log so judges see it on the dashboard side too).

**Phase t5 — `execute_early_settlement`**
- Frontend: `POST /agent/merchant/trigger-settlement` `{contract_id, discount_rate: 0.02}` → backend calls `fn_settle_contract_early` → DB transaction credits wholesaler wallet +RM 980, Ahmad's wallet +RM 20 rebate, contract status → `SOLVED`.
- Backend returns settlement details + reasoning text (Bedrock): *"Settled atomically. Principal RM 1,000 less RM 20 rebate — wholesaler receives RM 980, Ahmad's GO+ wallet credited with RM 20 saved."*
- ExecutionReceipt slides in with real ledger row hash from the response.

KPI strip subscribes to `wholesaler:liquidity-received` → calls `GET /dashboard/kpis` → LIQUIDITY AVAILABLE ticks **RM 37,400 → RM 38,380**. ESCROW LOCKED ticks **RM 6,600 → RM 5,600** (Ahmad's contract no longer locked). ShortfallAlert flips to `resolved`.

### Reset for next demo

Operator clicks the hidden lowercase `[reset]` link in the dashboard footer (40% opacity, no border, no chrome). Frontend calls `POST /demo/reset` → backend wipes + re-seeds → all subscribers receive `system:reset` bus event → all UI returns to baseline.

## Realistic data (the seed dataset)

```python
WHOLESALER = {
    "id": "ws-pasar-borong-ahmad",
    "name": "Pasar Borong Ahmad Trading",
    "wallet_balance": 3740000,  # minor units (sen) → RM 37,400
}

MERCHANTS = [
    {"id": "m-ahmad-yusof",     "name": "Ahmad bin Yusof",  "business": "Ayam Gepuk Mak Cik",  "location": "Setapak, KL",       "credit_score": 720, "qr_velocity_30d": 1840000},
    {"id": "m-siti-norhaliza",  "name": "Siti Norhaliza",   "business": "Mart Wangsa",          "location": "Wangsa Maju, KL",   "credit_score": 685, "qr_velocity_30d":  920000},
    {"id": "m-tan-mei-ling",    "name": "Tan Mei Ling",     "business": "Café Hang Tuah",       "location": "Bukit Bintang, KL", "credit_score": 745, "qr_velocity_30d": 1240000},
    {"id": "m-mohd-faisal",     "name": "Mohd Faisal",      "business": "Toko Buah Pasar Borong","location": "Selayang",          "credit_score": 660, "qr_velocity_30d":  640000},
    {"id": "m-rajesh-kumar",    "name": "Rajesh Kumar",     "business": "Kedai Runcit Sentral", "location": "Brickfields, KL",   "credit_score": 700, "qr_velocity_30d":  410000},
]

CONTRACTS = [
    # Active LOCKED — keep on dashboard at baseline
    {"merchant_id": "m-siti-norhaliza", "principal": 240000, "term_days": 14, "days_in": 11, "status": "FUNDED_INVESTED"},
    {"merchant_id": "m-mohd-faisal",    "principal": 320000, "term_days": 30, "days_in":  2, "status": "FUNDED_INVESTED"},
    # Historical — give the table some variety + the GO+ KPI a baseline
    {"merchant_id": "m-tan-mei-ling",   "principal": 182000, "term_days": 14, "days_in": 14, "status": "SOLVED",   "settled_at": "yesterday"},
    {"merchant_id": "m-rajesh-kumar",   "principal":  54000, "term_days": 30, "days_in": 30, "status": "SETTLED",  "settled_at": "8 days ago"},
]
# Note: no active contract for Ahmad at baseline. Scenario B creates it.
```

## Backend changes

### New: `backend/app/db/seed_demo.py`

Idempotent: clears `contracts`, `merchants`, `suppliers`, `wallets`, `investment_ledger` for known demo IDs (does NOT touch other rows), then re-inserts the dataset above. Uses fixed UUIDs per `STABLE_DEMO_IDS` map so the same merchant always gets the same ID across reset cycles. ~150 LOC.

### New: `backend/app/routers/demo.py`

Two endpoints:

```python
POST /demo/reset
→ calls seed_demo.run() → returns {ok: true, contracts: 4, merchants: 5}

GET /dashboard/kpis
→ aggregates:
  - escrow_locked_rm = SUM(principal) WHERE status IN ('FUNDED','FUNDED_INVESTED','MERCHANT_APPROVED')
  - liquidity_available_rm = wholesaler.wallet_balance
  - active_msmes = 128 (static for now)
  - go_plus_yield_30d_rm = 1860 (static for now)
```

### New: `backend/app/routers/agent.py` extensions

Add `reasoning_text: str` field to response models for these existing endpoints. Each endpoint, after computing the deterministic result, calls `bedrock_service.generate_reasoning(template, vars)` with a tightly-scoped prompt (200 chars max output requested) and includes the returned text in the response. On Bedrock failure, returns a hardcoded fallback string + logs the error.

Endpoints touched:
1. `POST /agent/supplier/optimize-discount` — wholesaler reasoning for picking Ahmad + the 2% number.
2. `POST /agent/merchant/audit-arbitrage` — already returns `decision_engine` text; rename to `reasoning_text` for consistency. Bedrock-generate it instead of formatting deterministic strings.
3. `POST /agent/merchant/request-underwriting` — merchant-side BNPL approval reasoning.
4. `POST /agent/merchant/trigger-settlement` — settlement justification.

Plus repurpose:
5. `GET /agent/merchant/analyze-velocity/{merchant_id}` — currently a stub. Update to call `/msme/demand-pressure/mock` internally + return the demand summary alongside Bedrock reasoning text. (Already wired into the existing tool log Scenario B path.)

### Modify: `backend/app/services/bedrock.py`

Add helper:

```python
def generate_reasoning(
    settings: Settings,
    *,
    role: str,             # "wholesaler" | "merchant"
    task: str,             # short human label, e.g. "discount optimization"
    facts: dict,           # structured input the LLM grounds in
    fallback: str,         # canned string if Bedrock 500s
    max_chars: int = 280,
) -> str:
    """One-shot Bedrock call returning ~200-280 chars of plain reasoning text.
    Logs + returns fallback on any error. Caller MUST provide fallback."""
```

Wraps existing `converse_text()`. Strips markdown. Cuts at `max_chars`.

### Modify: `backend/app/main.py`

Register the new `demo` router.

## Frontend changes

### New: `frontend/lib/text-stream.ts`

```ts
// ~30 LOC. Returns AbortController.
export function streamText(
  text: string,
  onChunk: (textSoFar: string) => void,
  opts?: { charsPerTick?: number; tickMs?: number }
): { promise: Promise<void>; abort: () => void };
```

Defaults: 2 chars per tick, 20ms tick → ~100 chars/sec, so a 250-char reasoning text takes ~2.5s. Tunable per call.

### Extend: `frontend/lib/api.ts`

Add typed wrappers for:
- `postDemoReset()`
- `getDashboardKpis()` → `{escrow_locked_rm, liquidity_available_rm, active_msmes, go_plus_yield_30d_rm}`
- `getActiveContracts(opts?)` → list of contracts (replaces hardcoded `escrowRows`)
- `postOptimizeDiscount({shortfallRm, contractId})` → `{optimalPct, discountRm, reasoningText}`
- `postAuditArbitrage({contractId, discountRate})` → `{decision, netGainRm, reasoningText}`
- `postRequestUnderwriting({merchantId, supplierId, principalRm, termDays})` → `{contractId, status, reasoningText}`
- `postTriggerSettlement({contractId, discountRate})` → `{status, settledAt, reasoningText, ledgerHash}`
- `getPredictDemand(merchantId)` → wraps `/msme/demand-pressure/mock` + reasoning

### Modify: `frontend/lib/swarm-machine.ts`

Currently each phase is `setTimeout`. New behavior per phase:
1. Call backend endpoint.
2. Receive response (reasoning text + structured data).
3. Push tool log entry with empty `reasoningText`.
4. Call `streamText(response.reasoningText, ...)` — its callback updates the entry's `reasoningText`.
5. Await stream completion → advance to next phase.

Keep `SCENARIO_TIMINGS` for the inter-phase pause + Scenario B's pauseAfterIndex/resumeOn.

On any backend error: log, fall back to the hardcoded reasoning string from `mock-data.ts`, continue. Demo never stalls.

### Modify: `frontend/components/dashboard/tool-log.tsx`

Each entry now optionally has `reasoningText: string`. When present, render it in italic editorial font under the tool name + detail line, with a soft fade-in for new chars.

### Modify: `frontend/components/dashboard/kpi-strip.tsx`

On mount and on bus events `merchant:escrow-locked`, `wholesaler:liquidity-received`, `system:reset` → call `getDashboardKpis()`. Cards 1 & 2 use response. Cards 3 & 4 stay from `mock-data.ts` (renamed `kpiStaticData`). Brief number-tick animation when value changes.

### Modify: `frontend/components/dashboard/escrow-table.tsx`

On mount and on `merchant:escrow-locked`, `merchant:offer-accepted`, `system:reset` → call `getActiveContracts()`. Replaces `escrowRows` import.

### Modify: `frontend/components/dashboard/dashboard-footer.tsx`

Add hidden `[reset]` link. Lowercase, `font-mono`, `text-[10px]`, `opacity-40 hover:opacity-100`, no border, no background. Position bottom-right of footer. On click → `postDemoReset()` → publish `system:reset` → reload data.

### Modify: `frontend/components/dashboard/swarm-console.tsx`

Remove the existing "Reset Demo" button text from the settled state (line 199-208 today). Settled phase still shows the ExecutionReceipt; users reset via the footer link instead.

### Modify: `frontend/components/mobile/screen-merchant-contract.tsx`

When user taps "Lock Escrow":
1. Call `postRequestUnderwriting({merchantId: ahmad, supplierId: wholesaler, principalRm: 1000, termDays: 14})`.
2. Show inline streamed reasoning text from response in a new "AI Underwriting" panel (uses `streamText`).
3. On success → publish `merchant:escrow-locked` with real `contractId`.
4. On failure → log, still publish locked event with a synthetic id so demo continues.

### Modify: `frontend/components/mobile/screen-merchant-offer.tsx`

When the M4 offer screen is shown:
1. Call `postAuditArbitrage({contractId, discountRate: 0.02})`.
2. Stream `reasoningText` into the existing offer detail area.
3. On user accept → publish `merchant:offer-accepted` with `{contractId, discountPct, payout}` (the contractId is what the wholesaler-side trigger-settlement needs).

### Modify: `frontend/lib/mock-data.ts`

- Rename `escrowRows[0]` to Ahmad / Ayam Gepuk Mak Cik / Setapak (already partially aligned).
- Update all numeric fields to match seed dataset.
- Move `kpis` → `kpiStaticData` (the part that stays hardcoded — cards 3 & 4 only).
- Keep `swarmToolsByScenario` and `toolCallsByScenario` as fallback for offline / Bedrock-failure path.
- Update `shortfallCopy.resolved.body` to use the real names.

### Add to: `frontend/lib/demo-bus.ts`

Add `system:reset` event type to the `BusEvent` union. Emitted by the footer reset link; consumed by KPI strip, escrow table, mobile, swarm console.

## The 5 Bedrock reasoning surfaces (consolidated)

(Plus the existing M1 alert insight, which already calls Bedrock via `/msme/demand-pressure/insight` — no new work, listed for completeness as surface 0.)

| # | Phase | Endpoint | Where it streams | Fallback |
|---|---|---|---|---|
| 0 | B-mobile-M1 | `POST /msme/demand-pressure/insight` (existing) | M1 alert body | (already implemented) |
| 1 | B-tool-log | `GET /agent/merchant/analyze-velocity/{id}` (repurposed) | Tool log entry on dashboard (Scenario B-t1 visualization) | "ayam gepuk velocity +18% w/w · stockout in 3 days" |
| 2 | B-mobile-M3 | `POST /agent/merchant/request-underwriting` | New "AI Underwriting" panel on M3 contract review | "Approved. 30d QR velocity RM 18,400 supports repayment." |
| 3 | A-tool-log | `POST /agent/supplier/optimize-discount` | Tool log entry on dashboard (one call, covers t1 target selection + t2 discount math) | "Ahmad's NET-14 day-0 escrow optimal — 2.0% nets RM 980, covers RM 800 + RM 180 buffer." |
| 4 | A-mobile-M4 | `POST /agent/merchant/audit-arbitrage` | Mobile offer screen "Yield arbitrage" area + replayed in A-t4 tool log | "+RM 18.50 vs holding 14d at 4% APY. ACCEPT." |
| 5 | A-tool-log | `POST /agent/merchant/trigger-settlement` | Tool log entry on dashboard + ExecutionReceipt | "Settled atomically. Wholesaler +RM 980, Ahmad's GO+ +RM 20." |

Each Bedrock call: ~1-2s synchronous, 200-280 char output. Total Bedrock latency per full demo: ~8-12s, distributed across phase transitions so no single wait dominates.

## Hidden reset behavior

```
Footer (right):  ────────────────────────────────────  [reset]
                                                      ↑ opacity-40, lowercase,
                                                        font-mono, no border
```

On click:
1. Confirm via tiny inline tooltip: "wipe + reseed db?" — yes/no.
2. `postDemoReset()` → `POST /demo/reset`.
3. On success → `publish({type: "system:reset"})`.
4. KPI strip + escrow table + mobile mock + swarm console all subscribe → reset local state + refetch.

No keyboard shortcut, no modal, no toast. Operator-only.

## Implementation phasing

1. **Backend foundation** — seed_demo.py + /demo/reset + /dashboard/kpis + Bedrock helper.
2. **Backend agent reasoning** — extend 4 existing /agent/* endpoints with reasoning_text.
3. **Frontend data plumbing** — api.ts wrappers + text-stream.ts util + bus event extension.
4. **Frontend dashboard live data** — KPI strip + escrow table.
5. **Frontend swarm machine real fetches** — replace setTimeout per phase.
6. **Frontend mobile real fetches** — M3 underwrite + M4 audit.
7. **Frontend hidden reset** — footer link + system:reset wiring.
8. **Mock data alignment** — rename merchant, align numbers.
9. **End-to-end smoke test** — click through both windows, verify story coherent.

## Acceptance criteria

- Operator hits `[reset]` → DB returns to seed state, KPIs show baseline, escrow table shows 2 active rows + 2 historical.
- Demo run B+A end-to-end produces:
  - 1 new contract row (Ahmad's, status `SOLVED` at end).
  - KPI ESCROW LOCKED tracks +RM 1,000 (lock) → -RM 1,000 (settle).
  - KPI LIQUIDITY AVAILABLE tracks +RM 980 at settle.
  - 5 distinct Bedrock-generated reasoning blocks streamed (1 on mobile M3, 3 on dashboard tool log, 1 on mobile M4).
  - All numbers match across surfaces (invoice RM 1,000 = mobile RM 1,000 = dashboard RM 1,000 = settled RM 980).
- Bedrock failure on any one call → that surface shows fallback string, demo continues.
- Reset works after a full demo run → state returns to baseline cleanly.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Bedrock latency spikes mid-demo | Fallback strings + 8s timeout on `generate_reasoning` |
| Cross-window bus events miss | localStorage is the durable layer for `invoice:draft-updated`; other events are tolerant of single-window misses |
| Seed script touches wrong rows | Use stable UUID prefix `m-`, `ws-`, `c-demo-` and only delete rows with those prefixes |
| Demo run leaves DB partial on error | Reset is one click; operator pre-flight habit |
| Mobile + dashboard out of sync if seed runs while demo open | `system:reset` bus event triggers refetch on all surfaces |
