# Phase 4 Implementation Plan — Mobile Mock (TNG eWallet User Flows)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty `/mobile-mock` placeholder with a polished TNG eWallet-styled phone mock that demonstrates both supply-chain personas (merchant + wholesaler) clicking through the user flows from [specs.md §6](specs.md). All-mock today; BroadcastChannel publishers wired so Phase 5/6 can subscribe from `/dashboard` without component changes.

**Architecture:**
- Single `/mobile-mock` page owns persona + scene state; routes to the right screen component.
- Phone shell (~390×844 fixed) frames every screen with a TNG-blue body and inner white viewport.
- `useDemoBus()` hook abstracts BroadcastChannel — single swap point when Supabase Realtime arrives in Phase 6.
- Two persona flows (merchant 4 scenes, wholesaler 3 scenes) selectable via a top toggle.
- Realistic mock data: `Ahmad bin Yusof`, `Hartono Manufacturing`, RM 1,000 / Net-14 / 2% discount / `ESC-7142` / etc.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19 client islands, Tailwind v4, shadcn `Slider`, `motion/react`, `lucide-react`. Geist Sans + Bricolage Grotesque + JetBrains Mono already loaded.

**Visual reference:** TNG eWallet "Receive" screen (provided by user). Reproduce these signatures:
- **Solid TNG-blue full-bleed body** (brighter cobalt, not our corporate `--tng-blue`); white content cards floating on blue
- **Tab strip** with yellow 3px underline on active tab
- **Pill buttons** — solid TNG-blue primary, white-with-blue-border secondary, fully rounded
- **TNG-red QR card** for the QR scan moment (one-off accent, signature)
- **Bottom sheet handle** affordance at base of screen
- **Generous white space** inside cards; 20px corner radius on every card

**Pre-build decisions:**
1. Add `--tng-blue-app: #1A5FE0` (brighter cobalt for the mobile body) and `--tng-red: #E63B4B` (QR card accent) tokens to globals.css. Existing `--tng-blue / --tng-yellow / --ink / --paper` stay untouched.
2. BroadcastChannel name: `think-n-go-bus` (constant in `lib/demo-bus.ts`).
3. Phone size: fixed 390 × 844 px on desktop. The browser window resizes around it; phone never resizes.
4. Inner screen scrolls if content overflows; the bezel does not.
5. Persona toggle is a demo affordance only (not a real persona switch) — placed inside the phone status bar for visibility.
6. NO real backend, no real AI. All data is from `lib/mobile-mock-data.ts`. Click handlers update local state and publish bus events.
7. M2 (QR scan) is a static viewfinder mock — no camera permission, no real scanner. After 1.2s the parsed result animates in.

**Verification:** Hackathon mode — `npx tsc --noEmit && npm run lint` must exit 0 after every task. User runs `npm run dev` and visually verifies after the final task.

---

## File map

**Create:**
```
frontend/lib/demo-bus.ts                                            BroadcastChannel hook + event types
frontend/lib/mobile-mock-data.ts                                    Realistic mock content for both personas
frontend/components/mobile/phone-shell.tsx                          Phone bezel + viewport + status bar slot
frontend/components/mobile/status-bar.tsx                           Mock iOS status bar (time/signal/battery)
frontend/components/mobile/persona-toggle.tsx                       MERCHANT | WHOLESALER pill
frontend/components/mobile/tng-button.tsx                           Primary + Secondary pill buttons
frontend/components/mobile/tng-card.tsx                             White floating card with rounded corners
frontend/components/mobile/tng-tab-bar.tsx                          Top tab strip with yellow underline
frontend/components/mobile/tng-app-header.tsx                       App header (back arrow + title)
frontend/components/mobile/screen-merchant-alert.tsx                M1 — AI alert + Fund & Order CTA
frontend/components/mobile/screen-merchant-scan.tsx                 M2 — QR scan viewfinder
frontend/components/mobile/screen-merchant-contract.tsx             M3 — Smart contract review
frontend/components/mobile/screen-merchant-offer.tsx                M4 — Push notification overlay
frontend/components/mobile/screen-wholesaler-clients.tsx            W1 — Client list
frontend/components/mobile/screen-wholesaler-liquidate.tsx          W2 — Liquidation entry
frontend/components/mobile/screen-wholesaler-awaiting.tsx           W3 — Awaiting confirmation
```

**Modify:**
```
frontend/app/globals.css                                            Add --tng-blue-app, --tng-red tokens + theme refs
frontend/app/mobile-mock/page.tsx                                   Replace placeholder; orchestrate persona + scene state
```

---

## Task 1: Add mobile palette tokens

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1.1: Insert two tokens into the `:root` block**

Locate the `/* === TNG brand === */` block in `frontend/app/globals.css`. After the existing `--tng-yellow-tint` line, add:

```css
  /* === TNG mobile === */
  --tng-blue-app: #1A5FE0;
  --tng-blue-app-deep: #1648B5;
  --tng-red: #E63B4B;
```

Then in the `@theme inline { ... }` block, after the existing `--color-tng-yellow-tint: var(--tng-yellow-tint);` line, add:

```css
  --color-tng-blue-app: var(--tng-blue-app);
  --color-tng-blue-app-deep: var(--tng-blue-app-deep);
  --color-tng-red: var(--tng-red);
```

- [ ] **Step 1.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 1.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/app/globals.css && git commit -m "$(cat <<'EOF'
feat(frontend): add tng-blue-app and tng-red tokens for mobile mock

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Build demo bus (BroadcastChannel abstraction)

**Files:**
- Create: `frontend/lib/demo-bus.ts`

- [ ] **Step 2.1: Write `frontend/lib/demo-bus.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";

export const BUS_CHANNEL = "think-n-go-bus";

export type BusEvent =
  | { type: "merchant:bnpl-funded";       payload: { escrowId: string; amount: number; bnpl: number } }
  | { type: "merchant:escrow-locked";     payload: { escrowId: string; amount: number; termDays: number } }
  | { type: "merchant:offer-accepted";    payload: { escrowId: string; discountPct: number; payout: number } }
  | { type: "wholesaler:offer-sent";      payload: { escrowId: string; discountPct: number; clientName: string } };

export function publish(event: BusEvent) {
  if (typeof window === "undefined") return;
  const ch = new BroadcastChannel(BUS_CHANNEL);
  ch.postMessage(event);
  ch.close();
}

export function useDemoBus(handler: (event: BusEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const ch = new BroadcastChannel(BUS_CHANNEL);
    ch.onmessage = (e: MessageEvent<BusEvent>) => ref.current(e.data);
    return () => ch.close();
  }, []);
}
```

- [ ] **Step 2.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 2.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/lib/demo-bus.ts && git commit -m "$(cat <<'EOF'
feat(frontend): broadcast channel hook for cross-window demo events

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mobile mock data

**Files:**
- Create: `frontend/lib/mobile-mock-data.ts`

- [ ] **Step 3.1: Write `frontend/lib/mobile-mock-data.ts`**

```ts
export const merchant = {
  name: "Ahmad bin Yusof",
  shortName: "Ahmad",
  business: "Restoran Selera Kampung",
  walletBalanceRm: 720,
  qrVelocity30dRm: 18400,
  healthScore: 82,
  phone: "+60 12-345 6789",
};

export const wholesaler = {
  name: "Hartono Manufacturing",
  rep: "Lim Wei Jian",
  rating: "AAA",
  walletBalanceRm: 184500,
  outstandingReceivablesRm: 241000,
};

export const stockoutAlert = {
  product: "Cooking oil 5L (carton ×6)",
  forecastDays: 3,
  recommendedQty: 2,
  unitPriceRm: 500,
  totalRm: 1000,
  shortfallRm: 500,
  trendingDelta: "+38% trailing 7-day",
};

export type EscrowDraft = {
  escrowId: string;
  wholesalerName: string;
  totalRm: number;
  ownFundsRm: number;
  bnplRm: number;
  termDays: number;
  dailyYieldRm: number;
  repaymentSweepPct: number;
  dispatchEta: string;
};

export const escrowDraft: EscrowDraft = {
  escrowId: "ESC-7142",
  wholesalerName: "Hartono Manufacturing",
  totalRm: 1000,
  ownFundsRm: 500,
  bnplRm: 500,
  termDays: 14,
  dailyYieldRm: 0.34,
  repaymentSweepPct: 5,
  dispatchEta: "Same-day dispatch",
};

export type ClientRow = {
  id: string;
  name: string;
  business: string;
  escrowRm: number;
  termDays: number;
  daysIn: number;
  health: "AAA" | "AA" | "A";
};

export const wholesalerClients: ClientRow[] = [
  { id: "c-1", name: "Ahmad bin Yusof",     business: "Restoran Selera Kampung", escrowRm: 1000,  termDays: 14, daysIn: 8,  health: "AAA" },
  { id: "c-2", name: "Siti Norhaliza",       business: "Mart Wangsa",             escrowRm: 2400,  termDays: 14, daysIn: 11, health: "AA"  },
  { id: "c-3", name: "Rajesh Kumar",         business: "Kedai Runcit Sentral",    escrowRm: 540,   termDays: 30, daysIn: 4,  health: "AAA" },
  { id: "c-4", name: "Tan Mei Ling",         business: "Café Hang Tuah",          escrowRm: 1820,  termDays: 14, daysIn: 12, health: "A"   },
  { id: "c-5", name: "Mohd Faisal",          business: "Toko Buah Pasar Borong",  escrowRm: 3200,  termDays: 30, daysIn: 2,  health: "AA"  },
];

export const offerPayload = {
  escrowId: "ESC-7142",
  defaultDiscountPct: 2.0,
  minDiscountPct: 1.0,
  maxDiscountPct: 5.0,
  stepDiscountPct: 0.1,
};

export function fmtRm(value: number, decimals: 0 | 2 = 0) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace("MYR", "RM");
}
```

- [ ] **Step 3.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 3.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/lib/mobile-mock-data.ts && git commit -m "$(cat <<'EOF'
feat(frontend): realistic mobile mock data for merchant and wholesaler flows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: TNG primitives — Button + Card

**Files:**
- Create: `frontend/components/mobile/tng-button.tsx`
- Create: `frontend/components/mobile/tng-card.tsx`

- [ ] **Step 4.1: Write `frontend/components/mobile/tng-button.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "yellow";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary: "bg-tng-blue-app text-white hover:bg-tng-blue-app-deep",
  secondary: "border border-tng-blue-app bg-white text-tng-blue-app hover:bg-tng-blue-app/5",
  yellow: "bg-tng-yellow text-ink hover:bg-tng-yellow/90",
};

export function TngButton({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
    />
  );
}
```

- [ ] **Step 4.2: Write `frontend/components/mobile/tng-card.tsx`**

```tsx
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function TngCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-[20px] bg-white p-5 text-ink shadow-sm", className)}
    />
  );
}
```

- [ ] **Step 4.3: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 4.4: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/tng-button.tsx frontend/components/mobile/tng-card.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): tng pill button and white card primitives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Status bar + phone shell

**Files:**
- Create: `frontend/components/mobile/status-bar.tsx`
- Create: `frontend/components/mobile/phone-shell.tsx`

- [ ] **Step 5.1: Write `frontend/components/mobile/status-bar.tsx`**

```tsx
import { Signal, Wifi, BatteryFull } from "lucide-react";

type Props = {
  /** Time string e.g. "23:34" */
  time?: string;
};

export function StatusBar({ time = "23:34" }: Props) {
  return (
    <div className="flex h-7 items-center justify-between px-5 text-[12px] font-semibold text-white">
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
        <BatteryFull className="size-4" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Write `frontend/components/mobile/phone-shell.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { StatusBar } from "./status-bar";

type Props = {
  children: React.ReactNode;
  /** Defaults to TNG mobile blue */
  bodyTone?: "blue" | "white";
  className?: string;
};

export function PhoneShell({ children, bodyTone = "blue", className }: Props) {
  const body = bodyTone === "blue" ? "bg-tng-blue-app" : "bg-white";

  return (
    <div className="grid min-h-screen place-items-center bg-paper-grid py-8">
      <div
        className={cn(
          "relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[44px] border-[10px] border-ink",
          body,
          className
        )}
      >
        <StatusBar />
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        <div className="flex h-7 items-center justify-center">
          <span className="h-1 w-32 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.3: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 5.4: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/status-bar.tsx frontend/components/mobile/phone-shell.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): phone shell with mock status bar and home indicator

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Persona toggle + TNG header + tab bar

**Files:**
- Create: `frontend/components/mobile/persona-toggle.tsx`
- Create: `frontend/components/mobile/tng-app-header.tsx`
- Create: `frontend/components/mobile/tng-tab-bar.tsx`

- [ ] **Step 6.1: Write `frontend/components/mobile/persona-toggle.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

export type Persona = "merchant" | "wholesaler";

type Props = {
  persona: Persona;
  onChange: (p: Persona) => void;
};

export function PersonaToggle({ persona, onChange }: Props) {
  return (
    <div className="mx-5 mt-2 inline-flex w-[calc(100%-2.5rem)] items-center rounded-full bg-white/15 p-[3px] backdrop-blur-sm">
      {(["merchant", "wholesaler"] as Persona[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "h-8 flex-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
            persona === p ? "bg-white text-tng-blue-app" : "text-white/70 hover:text-white"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6.2: Write `frontend/components/mobile/tng-app-header.tsx`**

```tsx
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  onBack?: () => void;
};

export function TngAppHeader({ title, onBack }: Props) {
  return (
    <header className="flex items-center gap-3 px-5 pb-3 pt-4 text-white">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 grid size-8 place-items-center rounded-full hover:bg-white/10"
        aria-label="Back"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
```

- [ ] **Step 6.3: Write `frontend/components/mobile/tng-tab-bar.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

type Props = {
  tabs: readonly string[];
  active: string;
  onChange?: (tab: string) => void;
};

export function TngTabBar({ tabs, active, onChange }: Props) {
  return (
    <nav className="flex items-end gap-6 border-b border-white/10 px-5 pb-2 text-white">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange?.(tab)}
            className="relative flex flex-col items-center pb-2 text-[14px] font-medium"
          >
            <span className={cn(isActive ? "text-white" : "text-white/55")}>{tab}</span>
            {isActive && (
              <span className="absolute -bottom-0.5 h-[3px] w-10 rounded-full bg-tng-yellow" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 6.4: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 6.5: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/persona-toggle.tsx frontend/components/mobile/tng-app-header.tsx frontend/components/mobile/tng-tab-bar.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): persona toggle, app header, and tab bar primitives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Merchant M1 — AI alert (BNPL recommendation)

**Files:**
- Create: `frontend/components/mobile/screen-merchant-alert.tsx`

- [ ] **Step 7.1: Write `frontend/components/mobile/screen-merchant-alert.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { Sparkles, TrendingUp, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { merchant, stockoutAlert, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onFundOrder: () => void;
};

export function ScreenMerchantAlert({ onFundOrder }: Props) {
  return (
    <>
      <TngAppHeader title="Home" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <div className="text-white">
          <p className="text-[12px] uppercase tracking-[0.1em] opacity-75">Good evening</p>
          <p className="text-xl font-semibold">{merchant.shortName}</p>
        </div>

        <TngCard className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Wallet balance</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{fmtRm(merchant.walletBalanceRm)}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-tng-blue-app/10 text-tng-blue-app">
            <Wallet className="size-6" />
          </div>
        </TngCard>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <TngCard className="border-l-4 border-tng-yellow">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-tng-yellow" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tng-blue-deep">
                AI Alert · Predictive Restock
              </span>
            </div>
            <p className="mt-3 text-base font-semibold leading-snug text-ink">
              High demand projected. Recommend {stockoutAlert.recommendedQty}× bulk order of {stockoutAlert.product}.
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Stock will run out in {stockoutAlert.forecastDays} days at current QR velocity ({stockoutAlert.trendingDelta}).
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stroke-soft pt-3 text-[12px]">
              <div>
                <p className="text-muted-foreground">Order total</p>
                <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(stockoutAlert.totalRm)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cash shortfall</p>
                <p className="mt-1 font-display text-lg font-bold text-tng-red">{fmtRm(stockoutAlert.shortfallRm)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-tng-blue-app/5 p-3 text-[12px] text-tng-blue-deep">
              <TrendingUp className="size-4 shrink-0" />
              <span>Approved for RM 500 fractional BNPL line · 0% if repaid via QR sweep</span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <TngButton onClick={onFundOrder}>Fund &amp; Order</TngButton>
              <TngButton variant="secondary">Dismiss</TngButton>
            </div>
          </TngCard>
        </motion.div>
      </div>
    </>
  );
}
```

- [ ] **Step 7.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 7.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-merchant-alert.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): merchant M1 — AI alert with BNPL recommendation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Merchant M2 — QR scan viewfinder

**Files:**
- Create: `frontend/components/mobile/screen-merchant-scan.tsx`

- [ ] **Step 8.1: Write `frontend/components/mobile/screen-merchant-scan.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { ScanLine } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onScanComplete: () => void;
  onBack: () => void;
};

export function ScreenMerchantScan({ onScanComplete, onBack }: Props) {
  useEffect(() => {
    const t = setTimeout(onScanComplete, 1800);
    return () => clearTimeout(t);
  }, [onScanComplete]);

  return (
    <>
      <TngAppHeader title="Scan QR" onBack={onBack} />

      <div className="flex flex-1 flex-col items-center justify-start gap-6 px-5 pb-6">
        <p className="text-center text-[13px] text-white/80">
          Hold steady — scanning {escrowDraft.wholesalerName}'s DuitNow QR
        </p>

        <div className="relative grid size-64 place-items-center overflow-hidden rounded-3xl border-2 border-tng-red bg-tng-red/5">
          {/* Corner brackets */}
          <span className="absolute left-3 top-3 size-6 border-l-2 border-t-2 border-white" />
          <span className="absolute right-3 top-3 size-6 border-r-2 border-t-2 border-white" />
          <span className="absolute bottom-3 left-3 size-6 border-b-2 border-l-2 border-white" />
          <span className="absolute bottom-3 right-3 size-6 border-b-2 border-r-2 border-white" />

          <ScanLine className="size-20 text-white/40" />

          <motion.span
            className="absolute left-0 right-0 h-[2px] bg-tng-yellow shadow-[0_0_12px_var(--tng-yellow)]"
            initial={{ top: "8%" }}
            animate={{ top: "92%" }}
            transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
        </div>

        <div className="rounded-2xl bg-tng-red px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Malaysia National QR
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mt-4 w-full rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm"
        >
          <p className="text-[10px] uppercase tracking-[0.1em] opacity-75">Detected</p>
          <p className="mt-1 text-base font-semibold">{escrowDraft.wholesalerName}</p>
          <p className="text-[12px] opacity-80">
            {fmtRm(escrowDraft.totalRm)} · Net-{escrowDraft.termDays} terms
          </p>
        </motion.div>
      </div>
    </>
  );
}
```

- [ ] **Step 8.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 8.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-merchant-scan.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): merchant M2 — QR scan viewfinder with auto-advance

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Merchant M3 — smart contract review

**Files:**
- Create: `frontend/components/mobile/screen-merchant-contract.tsx`

- [ ] **Step 9.1: Write `frontend/components/mobile/screen-merchant-contract.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { Lock, Coins, Clock, ArrowDownToLine } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onLock: () => void;
  onBack: () => void;
};

export function ScreenMerchantContract({ onLock, onBack }: Props) {
  const totalYield = escrowDraft.dailyYieldRm * escrowDraft.termDays;
  const ownPct = (escrowDraft.ownFundsRm / escrowDraft.totalRm) * 100;

  return (
    <>
      <TngAppHeader title="Smart Contract" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TngCard className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                Escrow ID · {escrowDraft.escrowId}
              </span>
              <span className="rounded-full bg-tng-blue-app/10 px-2 py-1 text-[10px] font-semibold text-tng-blue-app">
                Pending lock
              </span>
            </div>
            <p className="font-display text-3xl font-bold text-ink">{fmtRm(escrowDraft.totalRm)}</p>
            <p className="text-[12px] text-muted-foreground">
              to <strong className="text-ink">{escrowDraft.wholesalerName}</strong> · Net-{escrowDraft.termDays}
            </p>
          </TngCard>
        </motion.div>

        <TngCard className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Funding split
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-stroke-soft">
            <motion.div
              className="bg-tng-blue-app"
              initial={{ width: 0 }}
              animate={{ width: `${ownPct}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.div
              className="bg-tng-yellow"
              initial={{ width: 0 }}
              animate={{ width: `${100 - ownPct}%` }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-blue-app" />
              <div>
                <p className="text-muted-foreground">Own funds</p>
                <p className="font-display text-lg font-bold text-ink">{fmtRm(escrowDraft.ownFundsRm)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-yellow" />
              <div>
                <p className="text-muted-foreground">BNPL line</p>
                <p className="font-display text-lg font-bold text-ink">{fmtRm(escrowDraft.bnplRm)}</p>
              </div>
            </div>
          </div>
        </TngCard>

        <TngCard className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Terms
          </p>
          <Row icon={<Clock className="size-4" />}              label="Lock duration"      value={`${escrowDraft.termDays} days`} />
          <Row icon={<Coins className="size-4" />}              label="Daily yield"        value={`+${fmtRm(escrowDraft.dailyYieldRm, 2)} (TNG GO+)`} />
          <Row icon={<Coins className="size-4" />}              label={`Projected yield (${escrowDraft.termDays}d)`}    value={`+${fmtRm(totalYield, 2)}`} />
          <Row icon={<ArrowDownToLine className="size-4" />}    label="BNPL repayment"     value={`${escrowDraft.repaymentSweepPct}% sweep on incoming QR`} />
          <Row icon={<Lock className="size-4" />}               label="Settlement"         value={escrowDraft.dispatchEta} />
        </TngCard>

        <div className="mt-2 flex flex-col gap-2">
          <TngButton onClick={onLock}>
            <Lock className="mr-2 size-4" />
            Lock Escrow {fmtRm(escrowDraft.totalRm)}
          </TngButton>
          <TngButton variant="secondary" onClick={onBack}>
            Edit
          </TngButton>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stroke-soft pt-3 first:border-0 first:pt-0">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="text-tng-blue-app">{icon}</span>
        {label}
      </div>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}
```

- [ ] **Step 9.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 9.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-merchant-contract.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): merchant M3 — smart contract review with funding split

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Merchant M4 — push notification offer overlay

**Files:**
- Create: `frontend/components/mobile/screen-merchant-offer.tsx`

- [ ] **Step 10.1: Write `frontend/components/mobile/screen-merchant-offer.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  discountPct: number;
  onAccept: () => void;
  onDecline: () => void;
  settled: boolean;
};

export function ScreenMerchantOffer({ discountPct, onAccept, onDecline, settled }: Props) {
  const discountAmount = Math.round((escrowDraft.totalRm * discountPct) / 100);
  const payout = escrowDraft.totalRm - discountAmount;

  return (
    <div className="flex flex-1 flex-col items-center justify-end px-5 pb-10">
      {/* Lock-screen wallpaper hint behind the notification */}
      <div className="absolute inset-x-5 top-24 text-center text-white">
        <p className="font-display text-[60px] font-bold leading-none tracking-tight">23:34</p>
        <p className="mt-2 text-sm opacity-80">Friday, 25 April</p>
      </div>

      {settled ? (
        <motion.div
          key="settled"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <TngCard className="flex items-start gap-3 border-2 border-up">
            <CheckCircle2 className="size-6 shrink-0 text-up" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-up">Escrow released</p>
              <p className="mt-1 text-[14px] text-ink">
                {fmtRm(payout)} settled to {escrowDraft.wholesalerName}. {fmtRm(discountAmount)} returned to your wallet.
              </p>
            </div>
          </TngCard>
        </motion.div>
      ) : (
        <motion.div
          key="offer"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full"
        >
          <div className="overflow-hidden rounded-[24px] bg-white/15 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
              <span className="size-2 rounded-full bg-tng-yellow" />
              TNG Wallet · Now
            </div>
            <div className="bg-white p-5 text-ink">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tng-blue-deep">
                Wholesaler offer · Early release
              </p>
              <p className="mt-2 text-[15px] leading-snug text-ink">
                <strong>{escrowDraft.wholesalerName}</strong> offers a{" "}
                <strong className="text-tng-blue-app">{discountPct.toFixed(1)}%</strong> discount to release escrow{" "}
                <strong>{escrowDraft.escrowId}</strong> today instead of waiting Net-{escrowDraft.termDays}.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
                <Stat label="Original" value={fmtRm(escrowDraft.totalRm)} />
                <Stat label="Discount" value={`−${fmtRm(discountAmount)}`} accent />
                <Stat label="Wholesaler nets" value={fmtRm(payout)} />
              </div>

              <div className="mt-4 flex gap-2">
                <TngButton variant="secondary" onClick={onDecline}>
                  Decline
                </TngButton>
                <TngButton variant="yellow" onClick={onAccept}>
                  Accept · You earn {fmtRm(discountAmount)}
                </TngButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-base font-bold ${accent ? "text-tng-yellow" : "text-ink"}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 10.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 10.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-merchant-offer.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): merchant M4 — push notification offer with settled state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Wholesaler W1 — client list

**Files:**
- Create: `frontend/components/mobile/screen-wholesaler-clients.tsx`

- [ ] **Step 11.1: Write `frontend/components/mobile/screen-wholesaler-clients.tsx`**

```tsx
"use client";

import { ChevronRight, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { wholesaler, wholesalerClients, fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  onSelect: (client: ClientRow) => void;
};

export function ScreenWholesalerClients({ onSelect }: Props) {
  return (
    <>
      <TngAppHeader title="Receivables" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <TngCard className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{wholesaler.name}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Outstanding receivables</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{fmtRm(wholesaler.outstandingReceivablesRm)}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-tng-blue-app/10 text-tng-blue-app">
            <Wallet className="size-6" />
          </div>
        </TngCard>

        <div className="flex items-center justify-between text-white">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
            Active clients · {wholesalerClients.length}
          </span>
          <span className="text-[11px] opacity-75">Tap to liquidate</span>
        </div>

        <div className="flex flex-col gap-2">
          {wholesalerClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client)}
              className="group flex items-center gap-3 rounded-[20px] bg-white p-4 text-left transition-colors hover:bg-tng-blue-app/5"
            >
              <div className="grid size-10 place-items-center rounded-full bg-tng-blue-app/10 font-semibold text-tng-blue-app">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">{client.name}</p>
                <p className="text-[11px] text-muted-foreground">{client.business}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.06em]">
                  <span className="rounded bg-tng-blue-app/10 px-1.5 py-0.5 text-tng-blue-deep">
                    Net-{client.termDays}
                  </span>
                  <span className="text-muted-foreground">
                    Day {client.daysIn}/{client.termDays}
                  </span>
                  <span
                    className={
                      client.health === "AAA"
                        ? "ml-auto text-up"
                        : client.health === "AA"
                          ? "ml-auto text-tng-blue"
                          : "ml-auto text-tng-red"
                    }
                  >
                    {client.health}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-bold text-ink tabular-nums">{fmtRm(client.escrowRm)}</p>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 11.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 11.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-wholesaler-clients.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): wholesaler W1 — client list with health and term chips

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Wholesaler W2 — liquidation entry

**Files:**
- Create: `frontend/components/mobile/screen-wholesaler-liquidate.tsx`

- [ ] **Step 12.1: Write `frontend/components/mobile/screen-wholesaler-liquidate.tsx`**

```tsx
"use client";

import { Slider } from "@/components/ui/slider";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { offerPayload, fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  client: ClientRow;
  discountPct: number;
  onDiscountChange: (pct: number) => void;
  onSend: () => void;
  onBack: () => void;
};

export function ScreenWholesalerLiquidate({ client, discountPct, onDiscountChange, onSend, onBack }: Props) {
  const discountRm = Math.round((client.escrowRm * discountPct) / 100);
  const payout = client.escrowRm - discountRm;
  const daysSaved = client.termDays - client.daysIn;

  return (
    <>
      <TngAppHeader title="Send Offer" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <TngCard>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Counterparty</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{client.name}</p>
          <p className="text-[12px] text-muted-foreground">{client.business}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
            <div>
              <p className="text-muted-foreground">Escrow value</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(client.escrowRm)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Days remaining</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{daysSaved}</p>
            </div>
          </div>
        </TngCard>

        <TngCard>
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Discount offered
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-tng-blue-app">
              {discountPct.toFixed(1)}%
            </p>
          </div>

          <Slider
            value={[discountPct]}
            onValueChange={(v) => onDiscountChange(Array.isArray(v) ? v[0] : (v as number))}
            min={offerPayload.minDiscountPct}
            max={offerPayload.maxDiscountPct}
            step={offerPayload.stepDiscountPct}
            className="mt-4 [&_[data-slot=slider-track]]:bg-stroke-soft [&_[data-slot=slider-range]]:bg-tng-blue-app [&_[data-slot=slider-thumb]]:border-tng-blue-app [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:ring-tng-blue-app/30"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
            <div>
              <p className="text-muted-foreground">You receive today</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(payout)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">vs. waiting {daysSaved}d</p>
              <p className="mt-1 font-display text-lg font-bold text-tng-red">−{fmtRm(discountRm)}</p>
            </div>
          </div>
        </TngCard>

        <TngButton onClick={onSend}>
          Send offer to {client.name.split(" ")[0]}
        </TngButton>
      </div>
    </>
  );
}
```

- [ ] **Step 12.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 12.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-wholesaler-liquidate.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): wholesaler W2 — liquidation entry with discount slider

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Wholesaler W3 — awaiting + settled

**Files:**
- Create: `frontend/components/mobile/screen-wholesaler-awaiting.tsx`

- [ ] **Step 13.1: Write `frontend/components/mobile/screen-wholesaler-awaiting.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  client: ClientRow;
  discountPct: number;
  settled: boolean;
  onReset: () => void;
};

export function ScreenWholesalerAwaiting({ client, discountPct, settled, onReset }: Props) {
  const payout = Math.round(client.escrowRm * (1 - discountPct / 100));

  return (
    <>
      <TngAppHeader title={settled ? "Settled" : "Sending offer"} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-12 text-center">
        {settled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="grid size-20 place-items-center rounded-full bg-up/15">
              <CheckCircle2 className="size-12 text-up" />
            </div>
            <TngCard className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-up">Settled</p>
              <p className="mt-2 text-[14px] text-ink">
                <strong>{client.name.split(" ")[0]}</strong> accepted the {discountPct.toFixed(1)}% offer.
              </p>
              <p className="mt-3 font-display text-3xl font-bold text-ink">{fmtRm(payout)}</p>
              <p className="text-[12px] text-muted-foreground">credited to your wallet</p>
            </TngCard>
            <TngButton variant="secondary" onClick={onReset}>
              Back to clients
            </TngButton>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="relative grid size-20 place-items-center">
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-tng-yellow"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="size-3 rounded-full bg-tng-yellow" />
            </div>
            <p className="text-[15px] font-semibold">
              Offer sent to {client.name.split(" ")[0]}
            </p>
            <p className="max-w-[260px] text-[12px] opacity-80">
              Awaiting acceptance · The merchant&apos;s AI is evaluating your {discountPct.toFixed(1)}% offer now.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 13.2: Verify**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit
```

- [ ] **Step 13.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/components/mobile/screen-wholesaler-awaiting.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): wholesaler W3 — awaiting + settled states

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Compose mobile-mock page (orchestrator + bus wiring)

**Files:**
- Modify: `frontend/app/mobile-mock/page.tsx`

- [ ] **Step 14.1: Replace `frontend/app/mobile-mock/page.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PersonaToggle, type Persona } from "@/components/mobile/persona-toggle";
import { ScreenMerchantAlert } from "@/components/mobile/screen-merchant-alert";
import { ScreenMerchantScan } from "@/components/mobile/screen-merchant-scan";
import { ScreenMerchantContract } from "@/components/mobile/screen-merchant-contract";
import { ScreenMerchantOffer } from "@/components/mobile/screen-merchant-offer";
import { ScreenWholesalerClients } from "@/components/mobile/screen-wholesaler-clients";
import { ScreenWholesalerLiquidate } from "@/components/mobile/screen-wholesaler-liquidate";
import { ScreenWholesalerAwaiting } from "@/components/mobile/screen-wholesaler-awaiting";
import { publish, useDemoBus } from "@/lib/demo-bus";
import { escrowDraft, offerPayload, wholesalerClients } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type MerchantScene = "alert" | "scan" | "contract" | "offer";
type WholesalerScene = "clients" | "liquidate" | "awaiting";

export default function MobileMockPage() {
  const [persona, setPersona] = useState<Persona>("merchant");

  // Merchant flow state
  const [merchantScene, setMerchantScene] = useState<MerchantScene>("alert");
  const [offerSettled, setOfferSettled] = useState(false);
  const [incomingDiscountPct, setIncomingDiscountPct] = useState(offerPayload.defaultDiscountPct);

  // Wholesaler flow state
  const [wholesalerScene, setWholesalerScene] = useState<WholesalerScene>("clients");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [discountPct, setDiscountPct] = useState(offerPayload.defaultDiscountPct);
  const [wholesalerSettled, setWholesalerSettled] = useState(false);

  // Cross-window: when an offer is sent (from this or another window), surface it on the merchant side
  useDemoBus(
    useCallback((event) => {
      if (event.type === "wholesaler:offer-sent") {
        setIncomingDiscountPct(event.payload.discountPct);
        setOfferSettled(false);
        setPersona("merchant");
        setMerchantScene("offer");
      }
      if (event.type === "merchant:offer-accepted") {
        setWholesalerSettled(true);
      }
    }, [])
  );

  // === Merchant click handlers ===
  function fundOrder() {
    publish({
      type: "merchant:bnpl-funded",
      payload: { escrowId: escrowDraft.escrowId, amount: escrowDraft.totalRm, bnpl: escrowDraft.bnplRm },
    });
    setMerchantScene("scan");
  }

  function lockEscrow() {
    publish({
      type: "merchant:escrow-locked",
      payload: { escrowId: escrowDraft.escrowId, amount: escrowDraft.totalRm, termDays: escrowDraft.termDays },
    });
    setMerchantScene("offer");
    setOfferSettled(false);
  }

  function acceptOffer() {
    const discountRm = Math.round((escrowDraft.totalRm * incomingDiscountPct) / 100);
    publish({
      type: "merchant:offer-accepted",
      payload: {
        escrowId: escrowDraft.escrowId,
        discountPct: incomingDiscountPct,
        payout: escrowDraft.totalRm - discountRm,
      },
    });
    setOfferSettled(true);
  }

  function declineOffer() {
    setOfferSettled(false);
    setMerchantScene("alert");
  }

  // === Wholesaler click handlers ===
  function selectClient(client: ClientRow) {
    setSelectedClient(client);
    setDiscountPct(offerPayload.defaultDiscountPct);
    setWholesalerScene("liquidate");
  }

  function sendOffer() {
    if (!selectedClient) return;
    publish({
      type: "wholesaler:offer-sent",
      payload: {
        escrowId: selectedClient.id,
        discountPct,
        clientName: selectedClient.name,
      },
    });
    setWholesalerSettled(false);
    setWholesalerScene("awaiting");
  }

  function resetWholesaler() {
    setSelectedClient(null);
    setWholesalerSettled(false);
    setWholesalerScene("clients");
  }

  return (
    <PhoneShell>
      <PersonaToggle persona={persona} onChange={setPersona} />

      <AnimatePresence mode="wait">
        {persona === "merchant" ? (
          <motion.div
            key={`m-${merchantScene}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {merchantScene === "alert" && <ScreenMerchantAlert onFundOrder={fundOrder} />}
            {merchantScene === "scan" && (
              <ScreenMerchantScan
                onScanComplete={() => setMerchantScene("contract")}
                onBack={() => setMerchantScene("alert")}
              />
            )}
            {merchantScene === "contract" && (
              <ScreenMerchantContract onLock={lockEscrow} onBack={() => setMerchantScene("scan")} />
            )}
            {merchantScene === "offer" && (
              <ScreenMerchantOffer
                discountPct={incomingDiscountPct}
                onAccept={acceptOffer}
                onDecline={declineOffer}
                settled={offerSettled}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`w-${wholesalerScene}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {wholesalerScene === "clients" && <ScreenWholesalerClients onSelect={selectClient} />}
            {wholesalerScene === "liquidate" && selectedClient && (
              <ScreenWholesalerLiquidate
                client={selectedClient}
                discountPct={discountPct}
                onDiscountChange={setDiscountPct}
                onSend={sendOffer}
                onBack={() => setWholesalerScene("clients")}
              />
            )}
            {wholesalerScene === "awaiting" && selectedClient && (
              <ScreenWholesalerAwaiting
                client={selectedClient}
                discountPct={discountPct}
                settled={wholesalerSettled}
                onReset={resetWholesaler}
              />
            )}
            {/* Fallback if a sub-scene is selected without a client (e.g., after persona switch + back) */}
            {wholesalerScene !== "clients" && !selectedClient && (
              <div className="grid flex-1 place-items-center text-white/80 text-sm">
                Select a client to continue.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick reset for demo: appears as a tiny chip; non-themed so it stays visually subordinate */}
      <button
        type="button"
        onClick={() => {
          setMerchantScene("alert");
          setOfferSettled(false);
          resetWholesaler();
        }}
        className="absolute right-3 top-9 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] text-white/80 hover:bg-black/50"
      >
        reset
      </button>

      {/* Reference to wholesalerClients to keep the import meaningful even if nothing else touches it */}
      <span className="hidden">{wholesalerClients.length}</span>
    </PhoneShell>
  );
}
```

- [ ] **Step 14.2: Verify (typecheck + lint)**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go/frontend && npx tsc --noEmit && npm run lint
```

Both must exit 0. If lint flags the hidden span / unused-import workaround, remove the `<span className="hidden">` and the import — they exist only as belt-and-suspenders.

- [ ] **Step 14.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add frontend/app/mobile-mock/page.tsx && git commit -m "$(cat <<'EOF'
feat(frontend): mobile-mock orchestrator with persona toggle and bus wiring

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Update tasks.md + intelligence log

**Files:**
- Modify: `tasks.md`

- [ ] **Step 15.1: Flip Phase 4 items**

In `tasks.md` Phase 4:
- 4.1 → `[x]` with note: "Mobile mock at `/mobile-mock` shows full TNG eWallet styling (blue body, white cards, yellow tab underline, pill buttons). 7 screens across merchant (4) + wholesaler (3) flows from specs §6, click-driven with realistic mock data (Ahmad / Hartono / ESC-7142 / RM 1,000 Net-14)."
- 4.2 → `[x]` with note: "Accept/Decline buttons on merchant offer screen and Send Offer / awaiting transitions on wholesaler side. All click handlers publish to `useDemoBus()` so the dashboard can subscribe in Phase 5/6."
- 4.3 → `[x]` with note: "BroadcastChannel `think-n-go-bus` wired via `lib/demo-bus.ts`. Single hook `useDemoBus(handler)` for subscribers, `publish(event)` for emitters. Same-origin only — both phone and dashboard share `localhost:3000`. Swap target for Supabase Realtime is internal to the hook."

- [ ] **Step 15.2: Append intelligence-log entry (newest on top)**

```
- **2026-04-25** — Phase 4 done. `/mobile-mock` is a 390×844 phone shell on TNG-blue (`--tng-blue-app: #1A5FE0`) with a `MERCHANT | WHOLESALER` toggle. Merchant: M1 AI alert → M2 QR scan (auto-advances after 1.8s) → M3 smart contract review (own RM 500 + BNPL RM 500 split bar) → M4 push notification offer (overlay style). Wholesaler: W1 client list (5 mock rows) → W2 liquidation slider (1.0–5.0% discount) → W3 awaiting → settled. Cross-window plumbing: BroadcastChannel `think-n-go-bus`. `wholesaler:offer-sent` triggers M4 to surface even if dispatched from another window (cross-persona demo). Dashboard subscribes in Phase 5+. Two new CSS tokens: `--tng-blue-app` (mobile body), `--tng-red` (QR card brand accent). NO real backend, NO AI calls; everything is `setTimeout` + `useState`. (Claude)
```

- [ ] **Step 15.3: Commit**

```bash
cd c:/Users/USER/Documents/GitHub/think-n-go && git add tasks.md && git commit -m "$(cat <<'EOF'
docs: mark phase 4 complete in tasks.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage** (against `tasks.md` Phase 4 + `specs.md` §6 + user direction):
- ✅ specs §6.1 baseline: covered implicitly by M2 + M3 (scan + lock)
- ✅ specs §6.2 wholesaler-initiated liquidation: W1 → W2 → W3 wholesaler side; M4 merchant push notification + accept
- ✅ specs §6.3 merchant-initiated BNPL: M1 alert → M2 scan → M3 contract (own + BNPL split) → lock
- ✅ tasks.md 4.1 static notification component on `/mobile-mock` → Task 10 (M4)
- ✅ tasks.md 4.2 Accept/Decline buttons → Task 10
- ✅ tasks.md 4.3 wire to dashboard via BroadcastChannel → Task 2 (`useDemoBus`)
- ✅ User direction: TNG eWallet inspiration (blue body, white cards, pill buttons, yellow underline, TNG-red QR accent) → Tasks 1, 4, 5, 6, 8
- ✅ User direction: persona toggle on phone → Task 6
- ✅ User direction: realistic data (Ahmad, RM 1,000, Net-14, ESC-7142, etc.) → Task 3
- ✅ User direction: future dashboard sync via BroadcastChannel → Task 2
- ❌ Not done: dashboard listener wiring — explicitly out-of-scope per user ("In the future not now")

**Type consistency check:**
- `Persona` defined once in `persona-toggle.tsx`, imported by `mobile-mock/page.tsx` — consistent.
- `ClientRow` defined once in `mobile-mock-data.ts`, imported by `screen-wholesaler-clients.tsx`, `screen-wholesaler-liquidate.tsx`, `screen-wholesaler-awaiting.tsx`, `mobile-mock/page.tsx` — consistent.
- `BusEvent` discriminated union in `demo-bus.ts` — every `publish()` site uses literal `type` strings that match a union member. Verified: `merchant:bnpl-funded`, `merchant:escrow-locked`, `merchant:offer-accepted`, `wholesaler:offer-sent`. All present.
- `MerchantScene` / `WholesalerScene` are local to `page.tsx` and don't escape — fine.
- `escrowDraft.escrowId` (string) vs `BusEvent.payload.escrowId` (string) — match.

**No-placeholder scan:** every code step contains complete code; no "TBD" or "similar to". ✅

**Slider note:** `screen-wholesaler-liquidate.tsx` uses the same `Array.isArray(v) ? v[0] : (v as number)` shape that fixed the `yield-slider.tsx` crash earlier — preventing a recurrence on mobile.

**Hackathon-mode adherence (per [CLAUDE.md](CLAUDE.md)):**
- ❌ Zero unit tests (intentional)
- ❌ Zero error boundaries (intentional)
- ✅ Verify-by-clicking captured at end (user runs npm run dev)
- ✅ Frequent commits, one per task

**Risks I'm flagging:**
- The QR scan auto-advance (1.8s `setTimeout`) does not cancel if the user mashes Back during the wait — the cleanup in `useEffect` handles it on unmount, which fires on persona toggle or scene change. Should be safe.
- `motion/react`'s `AnimatePresence mode="wait"` may not fully unmount before the next scene mounts on rapid persona toggles. If the user spams the toggle, you may see brief overlapping screens. Acceptable for demo.
- The BroadcastChannel subscriber in `page.tsx` will receive its own `wholesaler:offer-sent` event when the same window publishes it. That's WHY M4 surfaces correctly in the same-window demo. Confirmed intentional.

---

## Execution Handoff

**Plan complete and saved to `plan-phase-4.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
