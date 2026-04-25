# Phase 2 Implementation Plan — Dashboard Business Stage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard` route's structural shell, design system foundation, KPI strip, Liquidity Projection chart, Escrow Pipeline table, mode switch, and arbitrage banner — using mock data, ready for Phase 3's swarm console to slot in.

**Architecture:**
- Server Components by default; `"use client"` only on components that own state/handlers (mode switch wrapper, motion-animated leaves, recharts chart).
- `/dashboard` route group has its own `layout.tsx` with sidebar + topbar; `page.tsx` composes the canvas grid (left = content, right = Phase 3 swarm placeholder).
- All data is mock, typed, exported from `lib/mock-data.ts`. Components consume props — when Supabase lands in Phase 6, swap one import.
- Design tokens (palette, fonts, spacing) live in `app/globals.css`; shadcn variables remap to brand colors.
- Motion library handles orchestrated page-load and the swarm pulse (the swarm itself comes Phase 3, but install motion now).

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind v4, shadcn/ui, Recharts, `motion`, lucide-react, JetBrains Mono / Bricolage Grotesque / Instrument Serif (via `next/font/google`), Geist (already loaded).

**Verification model:** Hackathon mode — no automated tests. Verify each task by running `npm run dev` and checking the browser. The "done" criterion for each task is stated explicitly under "Verify."

**Pre-build decisions locked (per [design.md §11](design.md)):**
1. Display font: Bricolage Grotesque (Google)
2. Editorial italic: Instrument Serif (Google)
3. Mono: JetBrains Mono (Google)
4. Motion library: `motion` (formerly framer-motion)
5. Currency: `RM` everywhere (no `$`)
6. Modes: `merchant` | `wholesaler` only — no `unified`
7. Dark mode: out of scope

---

## File map

**Create (new files):**
```
frontend/lib/mock-data.ts                                  Typed mock data + types
frontend/components/dashboard/sidebar.tsx                  Left rail nav
frontend/components/dashboard/topbar.tsx                   Top chrome (lockup + tabs + search + profile)
frontend/components/dashboard/mode-switch.tsx              Merchant ↔ Wholesaler segmented control (client)
frontend/components/dashboard/kpi-card.tsx                 Single KPI tile
frontend/components/dashboard/kpi-strip.tsx                4-card row with motion stagger
frontend/components/dashboard/liquidity-chart.tsx          Recharts AreaChart + SYS.COORD readout (client)
frontend/components/dashboard/status-pill.tsx              Mono status pill (Net-14 Locked / Pending / Posted)
frontend/components/dashboard/escrow-table.tsx             shadcn Table with restyled rows
frontend/components/dashboard/arbitrage-banner.tsx         Bottom alert ribbon
frontend/components/dashboard/dashboard-shell.tsx          Client wrapper holding mode state
frontend/components/dashboard/swarm-placeholder.tsx        Phase 3 stub
frontend/app/dashboard/layout.tsx                          Sidebar + topbar shell
```

**Modify:**
```
frontend/app/layout.tsx                                    Load three new fonts via next/font
frontend/app/globals.css                                   Add brand tokens, remap shadcn vars, grid bg
frontend/app/dashboard/page.tsx                            Compose KPIs + chart + table + banner + swarm-placeholder
frontend/package.json                                      Add `motion` dep
```

**Untouched** but referenced: shadcn primitives in `components/ui/*` (button, card, table, badge, tabs, slider, dialog, tooltip, progress).

---

## Task 1: Install motion + load three new fonts

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1.1: Install motion**

```bash
cd frontend && npm install motion
```

- [ ] **Step 1.2: Update layout.tsx to load Bricolage, JetBrains Mono, Instrument Serif via next/font**

Replace contents of `frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Geist, Bricolage_Grotesque, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
const instrument = Instrument_Serif({ subsets: ["latin"], variable: "--font-editorial", weight: ["400"], style: ["italic"] });

export const metadata: Metadata = {
  title: "Think 'n Go Command Center",
  description: "Agentic supply chain and liquidity dashboard for Malaysian MSMEs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(geist.variable, bricolage.variable, jetbrains.variable, instrument.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 1.3: Verify**

Run `npm run dev`. Visit `http://localhost:3000` (redirects to `/dashboard`). Open DevTools → Network → Fonts. Expect 4 font-family requests: Geist, Bricolage Grotesque, JetBrains Mono, Instrument Serif. No console errors.

- [ ] **Step 1.4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/app/layout.tsx
git commit -m "feat(frontend): load brand fonts via next/font and add motion"
```

---

## Task 2: Apply design tokens to globals.css

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 2.1: Replace globals.css with branded tokens**

Replace the entire contents of `frontend/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

:root {
  /* === Brand surface === */
  --ink: #0A0E27;
  --paper: #F7F5EE;
  --paper-grid: #EFEDE4;
  --stroke: #1D2654;
  --stroke-soft: #DCDAD0;
  --muted-text: #6B7280;

  /* === TNG brand === */
  --tng-blue: #0040A8;
  --tng-blue-deep: #002D72;
  --tng-blue-tint: #E8EFFF;
  --tng-yellow: #FFD300;
  --tng-yellow-tint: #FFF4B8;

  /* === Functional === */
  --up: #00875A;
  --down: #DE350B;
  --swarm-glow: rgba(255, 211, 0, 0.35);

  /* === shadcn remap === */
  --background: var(--paper);
  --foreground: var(--ink);
  --card: #FFFFFF;
  --card-foreground: var(--ink);
  --popover: #FFFFFF;
  --popover-foreground: var(--ink);
  --primary: var(--tng-blue);
  --primary-foreground: #FFFFFF;
  --secondary: var(--paper-grid);
  --secondary-foreground: var(--ink);
  --muted: var(--paper-grid);
  --muted-foreground: var(--muted-text);
  --accent: var(--tng-yellow-tint);
  --accent-foreground: var(--ink);
  --destructive: var(--down);
  --border: var(--stroke-soft);
  --input: var(--stroke-soft);
  --ring: var(--tng-blue);
  --chart-1: var(--tng-blue);
  --chart-2: var(--tng-yellow);
  --chart-3: var(--tng-blue-deep);
  --chart-4: var(--up);
  --chart-5: var(--down);
  --radius: 0.5rem;
  --sidebar: var(--paper);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--tng-blue);
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: var(--paper-grid);
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: var(--stroke-soft);
  --sidebar-ring: var(--tng-blue);
}

@theme inline {
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
  --font-editorial: var(--font-editorial);
  --color-ink: var(--ink);
  --color-paper: var(--paper);
  --color-paper-grid: var(--paper-grid);
  --color-stroke: var(--stroke);
  --color-stroke-soft: var(--stroke-soft);
  --color-tng-blue: var(--tng-blue);
  --color-tng-blue-deep: var(--tng-blue-deep);
  --color-tng-blue-tint: var(--tng-blue-tint);
  --color-tng-yellow: var(--tng-yellow);
  --color-tng-yellow-tint: var(--tng-yellow-tint);
  --color-up: var(--up);
  --color-down: var(--down);
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-feature-settings: "ss01", "cv11";
  font-variant-numeric: tabular-nums slashed-zero;
}

/* Graph-paper background — fixed so it doesn't scroll with content */
.bg-grid {
  background-image:
    linear-gradient(to right, var(--paper-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--paper-grid) 1px, transparent 1px);
  background-size: 24px 24px;
  background-attachment: fixed;
}

/* Pulsing yellow aura for SWARM ACTIVE — referenced in Phase 3 */
@keyframes swarm-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--swarm-glow); transform: scale(1); }
  50%      { box-shadow: 0 0 0 12px transparent;     transform: scale(1.04); }
}
.animate-swarm-pulse { animation: swarm-pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

/* Dashed connector animation for agent flow — Phase 3 */
@keyframes dash {
  to { stroke-dashoffset: -24; }
}
.animate-dash { animation: dash 800ms linear infinite; }
```

- [ ] **Step 2.2: Verify**

In `frontend/app/dashboard/page.tsx` (the placeholder), wrap the `<main>` with `className="bg-grid min-h-screen"` temporarily and reload. Expect a faint 24px graph-paper grid covering the canvas. Revert that test edit before commit.

Also add a temporary div with `className="font-display text-5xl text-tng-blue"`Hello`</div>` in the placeholder page — verify Bricolage Grotesque renders in TNG blue. Remove before commit.

- [ ] **Step 2.3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(frontend): brand design tokens, font variables, grid background"
```

---

## Task 3: Create mock data module

**Files:**
- Create: `frontend/lib/mock-data.ts`

- [ ] **Step 3.1: Write `frontend/lib/mock-data.ts`**

```ts
export type Mode = "merchant" | "wholesaler";

export type Kpi = {
  caption: string;
  value: string;
  trend: string;
  livePulse?: boolean;
};

export const kpis: Kpi[] = [
  { caption: "ESCROW LOCKED", value: "RM 145,000", trend: "+ live ledger", livePulse: true },
  { caption: "LIQUIDITY AVAILABLE", value: "RM 37,400", trend: "instant release" },
  { caption: "ACTIVE MSMES", value: "128", trend: "+ healthy cohort" },
  { caption: "GO+ YIELD 30D", value: "RM 1,860", trend: "daily accrual" },
];

export type ChartPoint = { day: number; baseTrend: number; risk: number | null };

export const liquidityProjection: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const wave = 80000 + Math.sin(i / 4) * 14000 + Math.cos(i / 7) * 7000;
  const drop = i >= 14 && i <= 19 ? 1 : 0;
  const baseTrend = Math.round(wave - drop * 18000);
  const risk = drop ? baseTrend - 4000 : null;
  return { day, baseTrend, risk };
});

export type EscrowStatus = "Net-14 Locked" | "Net-30 Escrow" | "Release Pending" | "Posted";

export type EscrowRow = {
  id: string;
  merchant: string;
  status: EscrowStatus;
  value: number;
};

export const escrowRows: EscrowRow[] = [
  { id: "e-1", merchant: "Acme Corp Logistics",   status: "Net-14 Locked",   value: 1240500 },
  { id: "e-2", merchant: "Stark Industries",      status: "Net-30 Escrow",   value: 850200 },
  { id: "e-3", merchant: "Wayne Enterprises",     status: "Release Pending", value: 4100000 },
  { id: "e-4", merchant: "Hartono Manufacturing", status: "Net-14 Locked",   value: 312400 },
  { id: "e-5", merchant: "Sime Components",       status: "Posted",          value: 96800 },
];

export const arbitrageOffer = {
  merchantCopy: "A wholesaler offered a 2.4% discount to release your escrow 14 days early.",
  wholesalerCopy: "The agentic swarm has identified a 2.4% yield differential on the Acme Corp escrow if released 14 days early.",
};

export function formatRm(value: number, opts?: { decimals?: 0 | 2 }) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(value).replace("MYR", "RM");
}
```

- [ ] **Step 3.2: Verify**

Run `npx tsc --noEmit` from `frontend/`. Expect zero errors.

- [ ] **Step 3.3: Commit**

```bash
git add frontend/lib/mock-data.ts
git commit -m "feat(frontend): typed mock data for dashboard"
```

---

## Task 4: Build Sidebar component

**Files:**
- Create: `frontend/components/dashboard/sidebar.tsx`

- [ ] **Step 4.1: Write `frontend/components/dashboard/sidebar.tsx`**

```tsx
import { LayoutDashboard, Database, Zap, Sparkles, History, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Database,        label: "Data Streams" },
  { icon: Zap,             label: "Execution" },
  { icon: Sparkles,        label: "AI Console" },
  { icon: History,         label: "History" },
];

const footerItems = [
  { icon: Settings, label: "Settings" },
  { icon: BookOpen, label: "Documentation" },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-stroke-soft bg-paper">
      <div className="p-6">
        <div className="mb-1 font-display text-base font-bold leading-none tracking-tight text-ink">
          Human Business
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Institutional Node
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
        </nav>
      </div>

      <div className="border-t border-stroke-soft p-3">
        <nav className="flex flex-col gap-1">
          {footerItems.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function NavRow({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-11 items-center gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-paper-grid hover:text-ink",
        active && "bg-paper-grid text-ink"
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-tng-blue" />}
      <Icon className="size-4" />
      {label}
    </button>
  );
}
```

- [ ] **Step 4.2: Verify**

Type-check: `npx tsc --noEmit`. Expect 0 errors.

- [ ] **Step 4.3: Commit**

```bash
git add frontend/components/dashboard/sidebar.tsx
git commit -m "feat(frontend): dashboard sidebar with nav rows"
```

---

## Task 5: Build Topbar + Mode Switch

**Files:**
- Create: `frontend/components/dashboard/mode-switch.tsx`
- Create: `frontend/components/dashboard/topbar.tsx`

- [ ] **Step 5.1: Write `frontend/components/dashboard/mode-switch.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/mock-data";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="inline-flex items-center border border-stroke-soft p-[2px]">
      {(["merchant", "wholesaler"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "h-7 px-3 text-xs font-medium uppercase tracking-[0.08em] transition-colors",
            mode === m ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5.2: Write `frontend/components/dashboard/topbar.tsx`**

```tsx
"use client";

import { Search, Bell } from "lucide-react";
import { ModeSwitch } from "./mode-switch";
import type { Mode } from "@/lib/mock-data";

const tabs = ["Dashboard", "Liquidity", "Forecasts", "Nodes"] as const;

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function Topbar({ mode, onModeChange }: Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-stroke-soft bg-paper px-6">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="size-2 bg-tng-blue" />
          <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink">
            Terminal
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={
                "relative h-14 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink " +
                (i === 0 ? "text-ink" : "")
              }
            >
              {tab}
              {i === 0 && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-tng-yellow" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <ModeSwitch mode={mode} onChange={onModeChange} />

        <div className="flex h-9 items-center gap-2 border-b border-stroke-soft pb-[1px] focus-within:border-tng-blue">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search parameters…"
            className="w-48 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <button type="button" className="relative grid size-9 place-items-center text-muted-foreground hover:text-ink">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-tng-yellow" />
        </button>

        <div className="size-7 rounded-full border border-stroke-soft bg-paper-grid" />
      </div>
    </header>
  );
}
```

- [ ] **Step 5.3: Verify**

Type-check: `npx tsc --noEmit`. Zero errors.

- [ ] **Step 5.4: Commit**

```bash
git add frontend/components/dashboard/mode-switch.tsx frontend/components/dashboard/topbar.tsx
git commit -m "feat(frontend): topbar with merchant/wholesaler mode switch"
```

---

## Task 6: Build KPI strip with motion stagger

**Files:**
- Create: `frontend/components/dashboard/kpi-card.tsx`
- Create: `frontend/components/dashboard/kpi-strip.tsx`

- [ ] **Step 6.1: Write `frontend/components/dashboard/kpi-card.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/mock-data";

type Props = Kpi & { index: number };

export function KpiCard({ caption, value, trend, livePulse, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.16 + index * 0.08,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={cn(
        "group relative flex flex-col justify-between border border-stroke-soft bg-card p-6 transition-colors",
        "hover:border-stroke"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {caption}
        </span>
        {livePulse && (
          <span className="size-1.5 animate-swarm-pulse rounded-full bg-tng-yellow" />
        )}
      </div>
      <div className="mt-6 font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-ink">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowUpRight className="size-3" />
        {trend}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 6.2: Write `frontend/components/dashboard/kpi-strip.tsx`**

```tsx
import { kpis } from "@/lib/mock-data";
import { KpiCard } from "./kpi-card";

export function KpiStrip() {
  return (
    <div className="grid grid-cols-4 gap-px bg-stroke-soft">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.caption} {...kpi} index={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6.3: Verify**

Type-check: `npx tsc --noEmit`. Zero errors. (Visual verify happens in Task 12 once page composes.)

- [ ] **Step 6.4: Commit**

```bash
git add frontend/components/dashboard/kpi-card.tsx frontend/components/dashboard/kpi-strip.tsx
git commit -m "feat(frontend): kpi strip with motion staggered entry"
```

---

## Task 7: Build Liquidity Projection chart

**Files:**
- Create: `frontend/components/dashboard/liquidity-chart.tsx`

- [ ] **Step 7.1: Look up Recharts AreaChart Tooltip cursor coordinates API via context7**

Use the context7 MCP:
- `resolve-library-id` for "Recharts"
- `query-docs` with id and query "AreaChart Tooltip cursor coordinate display custom tooltip with cursor position"

Goal: confirm we can read the active hover x/y from the Tooltip render-prop or chart's `onMouseMove`. If the cursor x/y isn't readily exposed, fallback: use the active payload's day/value as the SYS.COORD readout instead of pixel coords.

- [ ] **Step 7.2: Write `frontend/components/dashboard/liquidity-chart.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { liquidityProjection } from "@/lib/mock-data";

type CoordReadout = { day: number; value: number } | null;

export function LiquidityChart() {
  const [coord, setCoord] = useState<CoordReadout>(null);

  return (
    <section className="border border-stroke-soft bg-card p-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            Liquidity Projection
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">30-Day Forward Curve</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            SYS.COORD
          </div>
          <div className="font-mono text-[11px] text-ink">
            {coord
              ? `${coord.day.toString().padStart(2, "0")}.000 / ${(coord.value / 1000).toFixed(3)}`
              : "—.— / —.—"}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-tng-blue" />
              Base Trend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-down" />
              Shortfall Risk
            </span>
          </div>
        </div>
      </header>

      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={liquidityProjection}
            margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              if (state?.activePayload?.[0]?.payload) {
                const p = state.activePayload[0].payload as { day: number; baseTrend: number };
                setCoord({ day: p.day, value: p.baseTrend });
              }
            }}
            onMouseLeave={() => setCoord(null)}
          >
            <defs>
              <linearGradient id="baseTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--tng-blue)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--tng-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--paper-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--muted-text)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--stroke-soft)" }}
            />
            <YAxis
              tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--muted-text)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip cursor={{ stroke: "var(--ink)", strokeWidth: 1 }} content={() => null} />
            <Area
              type="monotone"
              dataKey="baseTrend"
              stroke="var(--tng-blue)"
              strokeWidth={2}
              fill="url(#baseTrendFill)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="var(--down)"
              strokeWidth={2}
              fill="var(--tng-yellow-tint)"
              fillOpacity={0.6}
              animationDuration={800}
              animationBegin={400}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 7.3: Verify**

Type-check: `npx tsc --noEmit`. Zero errors. (Browser verify Task 12.)

- [ ] **Step 7.4: Commit**

```bash
git add frontend/components/dashboard/liquidity-chart.tsx
git commit -m "feat(frontend): liquidity projection chart with SYS.COORD readout"
```

---

## Task 8: Build Status Pill + Escrow Pipeline table

**Files:**
- Create: `frontend/components/dashboard/status-pill.tsx`
- Create: `frontend/components/dashboard/escrow-table.tsx`

- [ ] **Step 8.1: Write `frontend/components/dashboard/status-pill.tsx`**

```tsx
import { Check, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EscrowStatus } from "@/lib/mock-data";

const styles: Record<EscrowStatus, { bg: string; fg: string; Icon: React.ElementType | null }> = {
  "Net-14 Locked":   { bg: "bg-tng-blue-tint",   fg: "text-tng-blue-deep", Icon: Lock },
  "Net-30 Escrow":   { bg: "bg-tng-blue-tint",   fg: "text-tng-blue-deep", Icon: Lock },
  "Release Pending": { bg: "bg-tng-yellow-tint", fg: "text-ink",           Icon: Clock },
  "Posted":          { bg: "bg-transparent",     fg: "text-up",            Icon: Check },
};

export function StatusPill({ status }: { status: EscrowStatus }) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.04em]",
        s.bg,
        s.fg,
        status === "Posted" && "border border-up/40"
      )}
    >
      {s.Icon && <s.Icon className="size-3" />}
      {status}
    </span>
  );
}
```

- [ ] **Step 8.2: Write `frontend/components/dashboard/escrow-table.tsx`**

```tsx
import { ArrowRight, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escrowRows, formatRm } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";

export function EscrowTable() {
  return (
    <section className="border border-stroke-soft bg-card">
      <header className="flex items-center justify-between border-b border-stroke-soft px-6 py-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          Escrow Pipeline
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-tng-blue hover:text-tng-blue-deep"
        >
          View Full Register
          <ArrowRight className="size-3.5" />
        </button>
      </header>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-stroke-soft">
            <TableHead className="px-6 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Merchant Entity
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Status / Term
            </TableHead>
            <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Settlement Value
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {escrowRows.map((row) => (
            <TableRow
              key={row.id}
              className="group relative border-b border-stroke-soft transition-colors last:border-b-0 hover:bg-paper-grid"
            >
              <TableCell className="relative px-6 py-4 text-sm font-medium text-ink">
                <span className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-tng-blue transition-transform group-hover:scale-y-100" />
                {row.merchant}
              </TableCell>
              <TableCell className="py-4">
                <StatusPill status={row.status} />
              </TableCell>
              <TableCell className="py-4 text-right font-mono text-sm tabular-nums text-ink">
                {formatRm(row.value)}
              </TableCell>
              <TableCell className="py-4 pr-6">
                <button
                  type="button"
                  className="grid size-7 place-items-center text-muted-foreground hover:text-ink"
                >
                  <MoreVertical className="size-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
```

- [ ] **Step 8.3: Verify**

Type-check: `npx tsc --noEmit`. Zero errors.

- [ ] **Step 8.4: Commit**

```bash
git add frontend/components/dashboard/status-pill.tsx frontend/components/dashboard/escrow-table.tsx
git commit -m "feat(frontend): escrow pipeline table with status pills"
```

---

## Task 9: Build Arbitrage banner

**Files:**
- Create: `frontend/components/dashboard/arbitrage-banner.tsx`

- [ ] **Step 9.1: Write `frontend/components/dashboard/arbitrage-banner.tsx`**

```tsx
import { TrendingUp } from "lucide-react";
import { arbitrageOffer } from "@/lib/mock-data";
import type { Mode } from "@/lib/mock-data";

export function ArbitrageBanner({ mode }: { mode: Mode }) {
  const copy = mode === "merchant" ? arbitrageOffer.merchantCopy : arbitrageOffer.wholesalerCopy;

  return (
    <section className="flex items-center justify-between border border-t-tng-blue border-x-stroke-soft border-b-stroke-soft bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center bg-tng-blue-tint text-tng-blue">
          <TrendingUp className="size-5" />
        </div>
        <div>
          <h3 className="font-editorial text-lg italic leading-tight text-tng-blue-deep">
            Arbitrage Opportunity Detected
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {copy}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 bg-tng-yellow px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-tng-yellow/90"
      >
        Review &amp; Execute
      </button>
    </section>
  );
}
```

> Note on the dashed top border: Tailwind v4's `border-t-{color}` plus a global `border-style: dashed` override is hairy. Phase 2.1-acceptable shortcut: use a 1px solid blue top border. We can upgrade to dashed in polish (Phase 7) by adding `border-t-2 [border-top-style:dashed]` once.

- [ ] **Step 9.2: Verify**

Type-check: `npx tsc --noEmit`. Zero errors.

- [ ] **Step 9.3: Commit**

```bash
git add frontend/components/dashboard/arbitrage-banner.tsx
git commit -m "feat(frontend): arbitrage opportunity banner"
```

---

## Task 10: Build Swarm placeholder

**Files:**
- Create: `frontend/components/dashboard/swarm-placeholder.tsx`

- [ ] **Step 10.1: Write `frontend/components/dashboard/swarm-placeholder.tsx`**

```tsx
import { Sparkles } from "lucide-react";

export function SwarmPlaceholder() {
  return (
    <aside className="relative flex min-h-screen flex-col gap-6 border-l border-tng-blue bg-gradient-to-b from-paper to-tng-blue-tint p-6">
      <div className="inline-flex items-center gap-2 self-start rounded-xl bg-tng-yellow px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink animate-swarm-pulse">
        <span className="size-1.5 rounded-full bg-ink" />
        SWARM ACTIVE
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 border border-dashed border-stroke-soft p-8 text-center">
        <Sparkles className="size-6 text-muted-foreground" />
        <p className="font-editorial text-base italic leading-snug text-muted-foreground">
          Swarm console arrives in Phase 3
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 10.2: Verify**

Type-check: `npx tsc --noEmit`. Zero errors.

- [ ] **Step 10.3: Commit**

```bash
git add frontend/components/dashboard/swarm-placeholder.tsx
git commit -m "feat(frontend): swarm console placeholder for phase 2"
```

---

## Task 11: Build Dashboard layout shell

**Files:**
- Create: `frontend/app/dashboard/layout.tsx`
- Create: `frontend/components/dashboard/dashboard-shell.tsx`

The shell is split: a server `layout.tsx` that hosts the static sidebar, and a client `DashboardShell` component that manages mode state for topbar + page children.

- [ ] **Step 11.1: Write `frontend/components/dashboard/dashboard-shell.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Topbar } from "./topbar";
import { SwarmPlaceholder } from "./swarm-placeholder";
import { ArbitrageBanner } from "./arbitrage-banner";
import type { Mode } from "@/lib/mock-data";

type Props = {
  staticContent: React.ReactNode;
};

export function DashboardShell({ staticContent }: Props) {
  const [mode, setMode] = useState<Mode>("merchant");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar mode={mode} onModeChange={setMode} />
      <div className="grid flex-1 grid-cols-[1.18fr_0.82fr]">
        <main className="bg-grid flex flex-col gap-px bg-paper p-6">
          {staticContent}
          <ArbitrageBanner mode={mode} />
        </main>
        <SwarmPlaceholder />
      </div>
    </div>
  );
}
```

- [ ] **Step 11.2: Write `frontend/app/dashboard/layout.tsx`**

```tsx
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar />
      {children}
    </div>
  );
}
```

- [ ] **Step 11.3: Verify**

Type-check: `npx tsc --noEmit`. Zero errors.

- [ ] **Step 11.4: Commit**

```bash
git add frontend/app/dashboard/layout.tsx frontend/components/dashboard/dashboard-shell.tsx
git commit -m "feat(frontend): dashboard shell with mode state and three-column grid"
```

---

## Task 12: Compose dashboard page (final integration)

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 12.1: Replace `frontend/app/dashboard/page.tsx`**

```tsx
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { LiquidityChart } from "@/components/dashboard/liquidity-chart";
import { EscrowTable } from "@/components/dashboard/escrow-table";

export default function DashboardPage() {
  return (
    <DashboardShell
      staticContent={
        <div className="flex flex-col gap-px bg-stroke-soft">
          <KpiStrip />
          <div className="flex flex-col gap-px bg-stroke-soft">
            <LiquidityChart />
            <EscrowTable />
          </div>
        </div>
      }
    />
  );
}
```

- [ ] **Step 12.2: Visual verification**

Run `npm run dev`. Visit `http://localhost:3000/dashboard`.

Expect:
1. Sidebar on the left (240px), warm cream background, "Human Business / Institutional Node" header, Overview row highlighted in blue indicator
2. Topbar with `▮ TERMINAL` lockup, four tabs (Dashboard underlined yellow), MERCHANT|WHOLESALER toggle (merchant active), search field, bell with yellow dot, avatar circle
3. Four KPI cards staggered in over ~400ms, first card has a tiny pulsing yellow dot
4. Liquidity chart renders blue area, with a yellow-tinted shortfall band around days 14–19; SYS.COORD reads `—.— / —.—` until you hover, then shows day/value
5. Escrow Pipeline table with 5 rows; Wayne Enterprises shows yellow `Release Pending` pill; hovering a row slides a 2px blue indicator on the left
6. Arbitrage banner across the bottom with italic title, blue chart icon tile, yellow Review & Execute button. Click MERCHANT/WHOLESALER and the body copy swaps.
7. Right panel: SWARM ACTIVE pill pulsing yellow, "Swarm console arrives in Phase 3" placeholder
8. Whole canvas has the faint 24px graph-paper grid

Open DevTools Console — zero errors, zero warnings related to our code (Recharts may surface React 19 ref warnings; ignore).

- [ ] **Step 12.3: Type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Both must exit 0.

- [ ] **Step 12.4: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): compose phase 2 dashboard page"
```

---

## Task 13: Update tasks.md + intelligence log

**Files:**
- Modify: `tasks.md`

- [ ] **Step 13.1: Flip Phase 2 items to `[x]`**

In `tasks.md` Phase 2:
- 2.1 → `[x]` with note: "Recharts AreaChart, two series, animated SYS.COORD live readout in top-right"
- 2.2 → `[x]` with note: "shadcn Table, custom StatusPill, hover blue-line slide-in"
- 2.3 → `[x]` with note: "4 KPIs with motion staggered entry; first card has live pulsing yellow dot"
- 2.4 → `[x]` with note: "merchant/wholesaler segmented control in topbar; banner copy reacts to mode"
- 2.5 → `[x]` with note: "all data in lib/mock-data.ts; components consume props; ready to swap to Supabase in Phase 6"

- [ ] **Step 13.2: Append intelligence-log entry (newest on top)**

```
- **2026-04-25** — Phase 2 done. Dashboard at `/dashboard` renders sidebar + topbar (with merchant/wholesaler mode switch) + KPI strip + Liquidity chart (recharts, animated, with SYS.COORD telemetry) + Escrow table (5 rows, status pills) + arbitrage banner (mode-aware copy) + swarm placeholder (right column). Brand tokens applied per design.md §3, fonts loaded (Bricolage / JetBrains Mono / Instrument Serif / Geist) via next/font. `motion` library installed. Mock data centralized in `lib/mock-data.ts` — swap point for Supabase in Phase 6. (Claude)
```

- [ ] **Step 13.3: Commit**

```bash
git add tasks.md
git commit -m "docs: mark phase 2 complete in tasks.md"
```

---

## Self-review

**Spec coverage:**
- ✅ tasks.md 2.1 Liquidity chart → Task 7
- ✅ tasks.md 2.2 Escrow pipeline table → Task 8
- ✅ tasks.md 2.3 Top status grid → Task 6
- ✅ tasks.md 2.4 Merchant/wholesaler mode switch (no unified) → Tasks 5 + 11 + 9 (banner reacts)
- ✅ tasks.md 2.5 Mock data with swap-out path → Task 3
- ✅ design.md §3 palette → Task 2
- ✅ design.md §4 typography → Task 1
- ✅ design.md §6 graph-paper background → Task 2
- ✅ design.md §7 motion: page-load orchestration → Task 6 (KPI stagger), Task 7 (chart draw)
- ✅ design.md §8.1 sidebar wireframe → Task 4
- ✅ design.md §8.2 topbar wireframe → Task 5
- ✅ design.md §8.6 arbitrage banner → Task 9
- ✅ design.md §8.7 swarm placeholder → Task 10 (full swarm = Phase 3)

**Type consistency check:**
- `Mode` exported once from `mock-data.ts`, imported by `mode-switch`, `topbar`, `dashboard-shell`, `arbitrage-banner` — consistent.
- `EscrowStatus` exported once, used by `status-pill` and `escrow-table` — consistent.
- `Kpi` type matches `KpiCard` props (extended with `index` in props, derived from `Kpi` shape) — consistent.
- `formatRm` defined in mock-data, used by `escrow-table` — consistent.

**No-placeholder scan:** every code step contains complete code. No "TBD" / "implement later" / "similar to Task N." ✅

**Hackathon-mode adherence (per [CLAUDE.md](CLAUDE.md)):**
- ❌ Zero unit tests written (intentional)
- ❌ Zero error boundaries (intentional)
- ✅ Verify-by-clicking captured in Task 12.2
- ✅ Frequent commits, one per task

---

## Execution Handoff

**Plan complete and saved to `plan-phase-2.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
