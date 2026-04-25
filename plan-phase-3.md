# Phase 3 Implementation Plan — Swarm Command Console

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `SwarmPlaceholder` in the right rail of `/dashboard` with a polished, animated agentic-AI workflow visualization that mocks the demo's tool-call sequence end-to-end. Static now, AI SDK-wired in Phase 5.

**Architecture:**
- One client orchestrator component (`SwarmConsole`) owns a state machine driving every animation: `idle → ingesting → optimizing → executing → settled`.
- Three vendored Kokonut UI components handle the AI motif (text streaming, reasoning state, atmospheric backdrop) — restyled with our `--tng-blue` / `--tng-yellow` tokens.
- Hand-built components handle the brand surface: SWARM ACTIVE badge, agent-flow nodes with SVG connectors, terminal tool log, yield slider, execution receipt.
- All timing constants live in one place so the 5-second demo cadence can be tuned without touching component code.

**Tech Stack:** React 19 RSC + client islands, Tailwind v4, shadcn/ui (Slider primitive), `motion/react` (formerly framer-motion v12), Kokonut UI vendored components, custom SVG for the agent-flow connectors, `lucide-react` icons.

**Verification model:** Hackathon mode — no automated tests. After every task: `cd frontend && npx tsc --noEmit && npm run lint`, both must exit 0. The user runs `npm run dev` and visually verifies after Task 11.

**Pre-build decisions locked:**
1. Vendor 3 Kokonut components: `ai-text-loading`, `ai-state-loading`, `beams-background` (atmospheric backdrop)
2. Skip 21st.dev "Agent Plan" — its workflow viz fights our hand-rolled SVG; we ship hand-rolled
3. Sequence cadence: total ~5 seconds (0ms / 1500ms / 3000ms / 4500ms phase boundaries)
4. Initiate Swarm button doubles as "Reset" once settled
5. Yield slider locks during running phases, free during idle/settled
6. Reinforce TNG palette: more `--tng-blue` on agent borders, log timestamps, ledger hashes; more `--tng-yellow` on active states, the CTA, the success ring; muted+subtle Beams backdrop tinted blue/yellow

---

## File map

**Vendored** (via Kokonut UI shadcn registry):
```
frontend/components/ui/ai-text-loading.tsx                 Streaming text loader (Kokonut)
frontend/components/ui/ai-state-loading.tsx                Reasoning indicator (Kokonut)
frontend/components/ui/beams-background.tsx                Animated beams backdrop (Kokonut)
```

**Created** (hand-built):
```
frontend/components/dashboard/swarm-console.tsx            Client orchestrator — state machine + composition
frontend/components/dashboard/swarm-badge.tsx              Pulsing SWARM ACTIVE pill with state dot
frontend/components/dashboard/agent-node.tsx               Single agent card (idle/active/done variants)
frontend/components/dashboard/agent-flow.tsx               3 stacked nodes + animated SVG dashed connectors
frontend/components/dashboard/tool-log.tsx                 Scrolling tool-call entries (terminal-style)
frontend/components/dashboard/yield-slider.tsx             shadcn Slider restyled, live offer math readout
frontend/components/dashboard/execution-receipt.tsx        Post-settle success card
frontend/lib/swarm-machine.ts                              Phase types + timing constants + helper
```

**Modified:**
```
frontend/lib/mock-data.ts                                  Add tool call list + ledger hash + agent node config
frontend/components/dashboard/dashboard-shell.tsx          Replace <SwarmPlaceholder /> with <SwarmConsole />
```

**Removed:**
```
frontend/components/dashboard/swarm-placeholder.tsx        Delete (replaced)
```

---

## Task 1: Define swarm state machine + extend mock data

**Files:**
- Create: `frontend/lib/swarm-machine.ts`
- Modify: `frontend/lib/mock-data.ts` (append)

- [ ] **Step 1.1: Write `frontend/lib/swarm-machine.ts`**

```ts
export type SwarmPhase = "idle" | "ingesting" | "optimizing" | "executing" | "settled";

export type AgentSlot = "ingest" | "optimize" | "execute";

export type AgentState = "idle" | "active" | "done";

export type ConnectorState = "idle" | "active" | "done";

export const PHASE_TIMINGS_MS = {
  ingesting: 0,
  optimizing: 1500,
  executing: 3000,
  settled: 4500,
} as const;

export const TOTAL_RUN_MS = 5000;

export function agentStateFor(slot: AgentSlot, phase: SwarmPhase): AgentState {
  const order: SwarmPhase[] = ["idle", "ingesting", "optimizing", "executing", "settled"];
  const phaseIdx = order.indexOf(phase);
  const slotIdx: Record<AgentSlot, number> = { ingest: 1, optimize: 2, execute: 3 };
  const me = slotIdx[slot];
  if (phaseIdx < me) return "idle";
  if (phaseIdx === me) return "active";
  return "done";
}

export function connectorStateFor(below: AgentSlot, phase: SwarmPhase): ConnectorState {
  const above = below === "optimize" ? "ingest" : "optimize";
  const aboveState = agentStateFor(above, phase);
  if (aboveState === "active") return "active";
  if (aboveState === "done") return "done";
  return "idle";
}
```

- [ ] **Step 1.2: Append to `frontend/lib/mock-data.ts`**

Add at the end of the file:

```ts
export type ToolCall = {
  id: string;
  timestamp: string;
  name: string;
  detail: string;
  /** Phase this entry should appear at */
  appearAt: "ingesting" | "optimizing" | "executing" | "settled";
};

export const toolCalls: ToolCall[] = [
  { id: "t-1", timestamp: "15:42:10", name: "escrow.lock",      detail: "RM 2,450 committed to TNG GO+ escrow",   appearAt: "ingesting"  },
  { id: "t-2", timestamp: "15:42:14", name: "bnpl.drawdown",    detail: "RM 500 fractional shortfall funded",      appearAt: "optimizing" },
  { id: "t-3", timestamp: "15:42:21", name: "go_plus.yield",    detail: "+RM 0.34 streaming · 1.8% APY",           appearAt: "optimizing" },
  { id: "t-4", timestamp: "15:43:02", name: "discount.offer",   detail: "2.0% early-release tendered to wholesaler", appearAt: "executing"  },
  { id: "t-5", timestamp: "15:43:08", name: "escrow.release",   detail: "Settlement posted · ledger 0xa9f3…b21c",   appearAt: "settled"    },
];

export type AgentMeta = {
  slot: "ingest" | "optimize" | "execute";
  title: string;
  subtitle: string;
  /** displayed in the active state */
  metric: string;
};

export const agents: AgentMeta[] = [
  { slot: "ingest",   title: "Data Ingest",     subtitle: "ACME_CORP_API",          metric: "stream live"     },
  { slot: "optimize", title: "Yield Optimizer", subtitle: "DELTA: +0.6%",           metric: "1.8% → 2.4%"     },
  { slot: "execute",  title: "Execution",       subtitle: "READY TO COMMIT",        metric: "RM 2,401 net"    },
];

export const ledgerHash = "0xa9f3b8e21c";

export const yieldOffer = {
  base: 1.8,
  default: 2.4,
  max: 4.0,
  step: 0.1,
  baseAmount: 2450,
};
```

- [ ] **Step 1.3: Verify**

Run from repo root:

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 1.4: Commit**

```bash
git add frontend/lib/swarm-machine.ts frontend/lib/mock-data.ts
git commit -m "$(cat <<'EOF'
feat(frontend): swarm state machine and tool-call mock data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Vendor Kokonut AI Text Loading

**Files:**
- Create: `frontend/components/ui/ai-text-loading.tsx`

- [ ] **Step 2.1: Confirm install URL via WebFetch**

Hit `https://kokonutui.com/docs/components/ai-text-loading` and look for an install command of the form `npx shadcn@latest add https://kokonutui.com/r/ai-text-loading.json`. If the page returns a different URL (slug variant or pro-only), record that. If the component is in the **Pro** tier, fall back: write a tiny replacement at `frontend/components/ui/ai-text-loading.tsx` (code provided in Step 2.3 fallback).

- [ ] **Step 2.2: Run install (if free)**

```bash
cd frontend && npx shadcn@latest add https://kokonutui.com/r/ai-text-loading.json
```

Confirm a file appears at `frontend/components/ui/ai-text-loading.tsx`. Open and inspect — note the export name.

- [ ] **Step 2.3: If install failed (Pro/404), write the fallback**

Create `frontend/components/ui/ai-text-loading.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

/**
 * Streaming text loader — characters fade in with a subtle wave.
 * Fallback for Kokonut UI's ai-text-loading.
 */
export function AITextLoading({ text, className }: Props) {
  const chars = Array.from(text);
  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.02,
            duration: 0.3,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2.4: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 2.5: Commit**

```bash
git add frontend/components/ui/ai-text-loading.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): vendor kokonut ai-text-loading component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Vendor Kokonut AI State Loading

**Files:**
- Create: `frontend/components/ui/ai-state-loading.tsx`

- [ ] **Step 3.1: Confirm install URL**

Hit `https://kokonutui.com/docs/components/ai-state-loading`. Look for the shadcn install command. If Pro/404, use the fallback in Step 3.3.

- [ ] **Step 3.2: Run install (if free)**

```bash
cd frontend && npx shadcn@latest add https://kokonutui.com/r/ai-state-loading.json
```

- [ ] **Step 3.3: Fallback if needed**

Create `frontend/components/ui/ai-state-loading.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

/**
 * Reasoning indicator — three dots cycle in TNG yellow.
 * Fallback for Kokonut UI's ai-state-loading.
 */
export function AIStateLoading({ label = "reasoning", className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-tng-blue-deep", className)}>
      <span>{label}</span>
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-tng-yellow"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </span>
    </div>
  );
}
```

- [ ] **Step 3.4: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 3.5: Commit**

```bash
git add frontend/components/ui/ai-state-loading.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): vendor kokonut ai-state-loading component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Vendor Kokonut Beams Background

**Files:**
- Create: `frontend/components/ui/beams-background.tsx`

- [ ] **Step 4.1: Confirm install URL**

Hit `https://kokonutui.com/docs/components/beams-background`. Find shadcn install URL. If unavailable, use fallback at Step 4.3.

- [ ] **Step 4.2: Run install (if free)**

```bash
cd frontend && npx shadcn@latest add https://kokonutui.com/r/beams-background.json
```

- [ ] **Step 4.3: Fallback if needed**

Create `frontend/components/ui/beams-background.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** 0–1 — how visible the beams are. Default 0.18 for atmospheric subtlety. */
  intensity?: number;
};

/**
 * Animated diagonal beams — subtle blue/yellow streaks behind content.
 * Fallback for Kokonut UI's beams-background.
 */
export function BeamsBackground({ className, intensity = 0.18 }: Props) {
  const beams = [
    { color: "var(--tng-blue)",   left: "8%",  delay: 0,   duration: 8 },
    { color: "var(--tng-yellow)", left: "32%", delay: 1.5, duration: 10 },
    { color: "var(--tng-blue)",   left: "55%", delay: 3,   duration: 9 },
    { color: "var(--tng-yellow)", left: "78%", delay: 0.8, duration: 11 },
  ];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {beams.map((b, i) => (
        <motion.div
          key={i}
          className="absolute top-[-20%] h-[140%] w-[2px] origin-top blur-[2px]"
          style={{ left: b.left, background: `linear-gradient(180deg, transparent, ${b.color}, transparent)`, opacity: intensity }}
          initial={{ y: "-30%" }}
          animate={{ y: "30%" }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4.4: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 4.5: Commit**

```bash
git add frontend/components/ui/beams-background.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): vendor kokonut beams-background component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build SwarmBadge

**Files:**
- Create: `frontend/components/dashboard/swarm-badge.tsx`

- [ ] **Step 5.1: Write `frontend/components/dashboard/swarm-badge.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { SwarmPhase } from "@/lib/swarm-machine";

type Props = {
  phase: SwarmPhase;
};

export function SwarmBadge({ phase }: Props) {
  const isRunning = phase !== "idle" && phase !== "settled";
  const label = phase === "settled" ? "SWARM SETTLED" : "SWARM ACTIVE";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-xl px-3 py-1.5",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink",
        phase === "settled" ? "bg-up text-paper" : "bg-tng-yellow",
        phase !== "settled" && "animate-swarm-pulse"
      )}
    >
      <motion.span
        className={cn("size-1.5 rounded-full", phase === "settled" ? "bg-paper" : "bg-ink")}
        animate={isRunning ? { scale: [1, 1.6, 1], opacity: [1, 0.4, 1] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, repeat: isRunning ? Infinity : 0, ease: "easeInOut" }}
      />
      {label}
    </div>
  );
}
```

- [ ] **Step 5.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 5.3: Commit**

```bash
git add frontend/components/dashboard/swarm-badge.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): swarm active/settled badge with phase-driven dot

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Build AgentNode

**Files:**
- Create: `frontend/components/dashboard/agent-node.tsx`

- [ ] **Step 6.1: Write `frontend/components/dashboard/agent-node.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { Database, TrendingUp, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIStateLoading } from "@/components/ui/ai-state-loading";
import type { AgentMeta } from "@/lib/mock-data";
import type { AgentState } from "@/lib/swarm-machine";

const ICONS = {
  ingest: Database,
  optimize: TrendingUp,
  execute: Zap,
} as const;

type Props = {
  agent: AgentMeta;
  state: AgentState;
  /** Only present on the execute node */
  cta?: React.ReactNode;
};

export function AgentNode({ agent, state, cta }: Props) {
  const Icon = ICONS[agent.slot];
  const isActive = state === "active";
  const isDone = state === "done";

  return (
    <motion.div
      layout
      animate={{
        borderColor: isActive ? "var(--tng-yellow)" : isDone ? "var(--tng-blue)" : "var(--stroke-soft)",
        boxShadow: isActive ? "0 0 0 4px var(--swarm-glow)" : "0 0 0 0 transparent",
      }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative flex flex-col gap-3 border bg-card p-4",
        isDone && "bg-tng-blue-tint/40"
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-8 place-items-center transition-colors",
              isActive ? "bg-tng-yellow text-ink" : isDone ? "bg-tng-blue text-paper" : "bg-paper-grid text-muted-foreground"
            )}
          >
            {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
          </span>
          <div>
            <h3 className="font-display text-sm font-bold leading-none tracking-tight text-ink">
              {agent.title}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {agent.subtitle}
            </p>
          </div>
        </div>
      </header>

      {isActive && (
        <div className="flex items-center justify-between border-t border-stroke-soft pt-3">
          <span className="font-mono text-[11px] text-tng-blue-deep">{agent.metric}</span>
          <AIStateLoading />
        </div>
      )}

      {isDone && (
        <div className="flex items-center justify-between border-t border-stroke-soft pt-3 font-mono text-[11px] text-up">
          <span>{agent.metric}</span>
          <span className="uppercase tracking-[0.08em]">complete</span>
        </div>
      )}

      {cta && <div className="border-t border-stroke-soft pt-3">{cta}</div>}
    </motion.div>
  );
}
```

- [ ] **Step 6.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 6.3: Commit**

```bash
git add frontend/components/dashboard/agent-node.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): agent node card with idle/active/done states

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Build AgentFlow with animated SVG connectors

**Files:**
- Create: `frontend/components/dashboard/agent-flow.tsx`

- [ ] **Step 7.1: Write `frontend/components/dashboard/agent-flow.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { AgentNode } from "./agent-node";
import { agents } from "@/lib/mock-data";
import { agentStateFor, connectorStateFor } from "@/lib/swarm-machine";
import type { SwarmPhase } from "@/lib/swarm-machine";

type Props = {
  phase: SwarmPhase;
  ctaForExecute: React.ReactNode;
};

export function AgentFlow({ phase, ctaForExecute }: Props) {
  const ingest = agents.find((a) => a.slot === "ingest")!;
  const optimize = agents.find((a) => a.slot === "optimize")!;
  const execute = agents.find((a) => a.slot === "execute")!;

  return (
    <div className="flex flex-col">
      <AgentNode agent={ingest} state={agentStateFor("ingest", phase)} />
      <Connector state={connectorStateFor("optimize", phase)} />
      <AgentNode agent={optimize} state={agentStateFor("optimize", phase)} />
      <Connector state={connectorStateFor("execute", phase)} />
      <AgentNode agent={execute} state={agentStateFor("execute", phase)} cta={ctaForExecute} />
    </div>
  );
}

function Connector({ state }: { state: "idle" | "active" | "done" }) {
  const stroke =
    state === "active" ? "var(--tng-yellow)" : state === "done" ? "var(--tng-blue)" : "var(--stroke-soft)";
  return (
    <svg
      width="100%"
      height="36"
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="block"
    >
      <line
        x1="50"
        y1="0"
        x2="50"
        y2="36"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray={state === "active" ? "6 6" : "0"}
        className={cn(state === "active" && "animate-dash")}
      />
    </svg>
  );
}
```

- [ ] **Step 7.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 7.3: Commit**

```bash
git add frontend/components/dashboard/agent-flow.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): agent-flow with animated svg dashed connectors

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Build ToolLog

**Files:**
- Create: `frontend/components/dashboard/tool-log.tsx`

- [ ] **Step 8.1: Write `frontend/components/dashboard/tool-log.tsx`**

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AITextLoading } from "@/components/ui/ai-text-loading";
import { toolCalls } from "@/lib/mock-data";
import type { SwarmPhase } from "@/lib/swarm-machine";

const PHASE_ORDER: SwarmPhase[] = ["idle", "ingesting", "optimizing", "executing", "settled"];

function visibleEntries(phase: SwarmPhase) {
  const reachedIdx = PHASE_ORDER.indexOf(phase);
  return toolCalls.filter((tc) => PHASE_ORDER.indexOf(tc.appearAt) <= reachedIdx);
}

type Props = {
  phase: SwarmPhase;
};

export function ToolLog({ phase }: Props) {
  const entries = visibleEntries(phase);
  // Most recent first
  const ordered = [...entries].reverse();

  return (
    <section className="flex flex-col gap-2 border border-stroke-soft bg-card/60 p-3 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-stroke-soft pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          tool log
        </span>
        <span className="font-mono text-[10px] tabular-nums text-tng-blue">
          {entries.length}/{toolCalls.length}
        </span>
      </header>

      <div className="flex min-h-[160px] flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {ordered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-editorial text-sm italic text-muted-foreground"
            >
              awaiting first dispatch…
            </motion.p>
          ) : (
            ordered.map((entry, i) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i === 0 ? 1 : 0.6, x: 0 }}
                transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                className="grid grid-cols-[12px_64px_1fr] items-start gap-2 font-mono text-[11px]"
              >
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full",
                    i === 0 ? "bg-tng-yellow" : "bg-stroke-soft"
                  )}
                />
                <span className="text-tng-blue tabular-nums">{entry.timestamp}</span>
                <span className="flex flex-col gap-0.5">
                  <span className={cn("font-medium", i === 0 ? "text-ink" : "text-muted-foreground")}>
                    {entry.name}
                  </span>
                  {i === 0 ? (
                    <AITextLoading text={entry.detail} className="text-[10px] text-muted-foreground" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{entry.detail}</span>
                  )}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
```

- [ ] **Step 8.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 8.3: Commit**

```bash
git add frontend/components/dashboard/tool-log.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): tool log with phase-driven entry stream

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Build YieldSlider

**Files:**
- Create: `frontend/components/dashboard/yield-slider.tsx`

- [ ] **Step 9.1: Write `frontend/components/dashboard/yield-slider.tsx`**

```tsx
"use client";

import { Slider } from "@/components/ui/slider";
import { yieldOffer, formatRm } from "@/lib/mock-data";

type Props = {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
};

export function YieldSlider({ value, onChange, disabled = false }: Props) {
  const delta = (value - yieldOffer.base) / 100;
  const deltaAmount = Math.round(yieldOffer.baseAmount * delta);

  return (
    <section className="flex flex-col gap-3 border border-stroke-soft bg-card p-4">
      <header className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          yield arbitrage
        </span>
        <span className="font-display text-2xl font-bold tabular-nums text-ink">
          {value.toFixed(1)}%
        </span>
      </header>

      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={yieldOffer.base}
        max={yieldOffer.max}
        step={yieldOffer.step}
        disabled={disabled}
        className="[&_[data-slot=slider-track]]:bg-stroke-soft [&_[data-slot=slider-range]]:bg-tng-yellow [&_[data-slot=slider-thumb]]:border-tng-yellow [&_[data-slot=slider-thumb]]:bg-ink [&_[data-slot=slider-thumb]]:ring-tng-yellow/30"
      />

      <footer className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">offer delta</span>
        <span className="text-tng-blue-deep tabular-nums">
          +{formatRm(deltaAmount)} on RM {yieldOffer.baseAmount.toLocaleString("en-MY")}
        </span>
      </footer>
    </section>
  );
}
```

- [ ] **Step 9.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0. Note: shadcn's Slider uses Radix internally; the `[&_[data-slot=...]]` selectors may need adjustment if the actual slot names differ. If typecheck passes but the visual styling doesn't apply at integration, inspect `frontend/components/ui/slider.tsx` for the actual `data-slot` attribute names.

- [ ] **Step 9.3: Commit**

```bash
git add frontend/components/dashboard/yield-slider.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): yield arbitrage slider with live delta readout

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Build ExecutionReceipt

**Files:**
- Create: `frontend/components/dashboard/execution-receipt.tsx`

- [ ] **Step 10.1: Write `frontend/components/dashboard/execution-receipt.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { ledgerHash, formatRm, yieldOffer } from "@/lib/mock-data";

type Props = {
  yieldPercent: number;
};

export function ExecutionReceipt({ yieldPercent }: Props) {
  const settlementAmount = Math.round(yieldOffer.baseAmount * (1 - yieldPercent / 100));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative flex flex-col gap-3 border-2 border-up bg-card p-4 shadow-[0_0_0_4px_color-mix(in_oklab,var(--up)_15%,transparent)]"
    >
      <header className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-up">
        <CheckCircle2 className="size-4" />
        settled
      </header>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">ledger</span>
        <span className="text-right text-tng-blue-deep">{ledgerHash}</span>

        <span className="text-muted-foreground">discount</span>
        <span className="text-right text-ink tabular-nums">{yieldPercent.toFixed(1)}%</span>

        <span className="text-muted-foreground">net to wholesaler</span>
        <span className="text-right font-display text-base font-bold text-ink">{formatRm(settlementAmount)}</span>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 10.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 10.3: Commit**

```bash
git add frontend/components/dashboard/execution-receipt.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): execution receipt with ledger hash and success ring

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Build SwarmConsole orchestrator

**Files:**
- Create: `frontend/components/dashboard/swarm-console.tsx`

- [ ] **Step 11.1: Write `frontend/components/dashboard/swarm-console.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Play, RotateCcw } from "lucide-react";
import { BeamsBackground } from "@/components/ui/beams-background";
import { SwarmBadge } from "./swarm-badge";
import { AgentFlow } from "./agent-flow";
import { ToolLog } from "./tool-log";
import { YieldSlider } from "./yield-slider";
import { ExecutionReceipt } from "./execution-receipt";
import { yieldOffer } from "@/lib/mock-data";
import { PHASE_TIMINGS_MS, TOTAL_RUN_MS } from "@/lib/swarm-machine";
import type { SwarmPhase } from "@/lib/swarm-machine";
import { cn } from "@/lib/utils";

export function SwarmConsole() {
  const [phase, setPhase] = useState<SwarmPhase>("idle");
  const [yieldPct, setYieldPct] = useState<number>(yieldOffer.default);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }

  function runSequence() {
    clearTimers();
    setPhase("ingesting");
    timeouts.current.push(setTimeout(() => setPhase("optimizing"), PHASE_TIMINGS_MS.optimizing));
    timeouts.current.push(setTimeout(() => setPhase("executing"),  PHASE_TIMINGS_MS.executing));
    timeouts.current.push(setTimeout(() => setPhase("settled"),    PHASE_TIMINGS_MS.settled));
  }

  function reset() {
    clearTimers();
    setPhase("idle");
  }

  useEffect(() => () => clearTimers(), []);

  const isRunning = phase !== "idle" && phase !== "settled";
  const ctaLabel = phase === "idle" ? "Initiate Swarm" : phase === "settled" ? "Run Again" : "Running…";

  return (
    <aside className="relative flex h-full flex-col overflow-hidden border-l border-tng-blue bg-gradient-to-b from-paper to-tng-blue-tint">
      <BeamsBackground intensity={0.14} />

      <div className="relative flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <SwarmBadge phase={phase} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {phase === "idle" ? "ready" : phase === "settled" ? "done" : "live"} · {(TOTAL_RUN_MS / 1000).toFixed(1)}s run
          </span>
        </div>

        <AgentFlow
          phase={phase}
          ctaForExecute={
            <button
              type="button"
              onClick={phase === "settled" ? reset : phase === "idle" ? runSequence : undefined}
              disabled={isRunning}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                phase === "settled" ? "bg-ink text-paper hover:bg-tng-blue-deep" : "bg-tng-yellow text-ink hover:bg-tng-yellow/90",
                isRunning && "cursor-not-allowed opacity-60"
              )}
            >
              {phase === "settled" ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
              {ctaLabel}
            </button>
          }
        />

        <ToolLog phase={phase} />

        <YieldSlider value={yieldPct} onChange={setYieldPct} disabled={isRunning} />

        <AnimatePresence>
          {phase === "settled" && <ExecutionReceipt key="receipt" yieldPercent={yieldPct} />}
        </AnimatePresence>
      </div>
    </aside>
  );
}
```

- [ ] **Step 11.2: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expect exit 0.

- [ ] **Step 11.3: Commit**

```bash
git add frontend/components/dashboard/swarm-console.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): swarm console orchestrator with state machine

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Wire SwarmConsole, delete placeholder, finalize

**Files:**
- Modify: `frontend/components/dashboard/dashboard-shell.tsx`
- Delete: `frontend/components/dashboard/swarm-placeholder.tsx`

- [ ] **Step 12.1: Replace `frontend/components/dashboard/dashboard-shell.tsx`**

Open the file, locate the import of `SwarmPlaceholder` and the JSX `<SwarmPlaceholder />`. Replace with:

```tsx
import { SwarmConsole } from "./swarm-console";
```

…and:

```tsx
<SwarmConsole />
```

The full updated file should read:

```tsx
"use client";

import { useState } from "react";
import { Topbar } from "./topbar";
import { SwarmConsole } from "./swarm-console";
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
        <SwarmConsole />
      </div>
    </div>
  );
}
```

- [ ] **Step 12.2: Delete the placeholder file**

```bash
rm frontend/components/dashboard/swarm-placeholder.tsx
```

- [ ] **Step 12.3: Run typecheck + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Both must exit 0. If lint surfaces an unused-import on `SwarmPlaceholder` somewhere, grep and remove.

- [ ] **Step 12.4: Commit**

```bash
git add frontend/components/dashboard/dashboard-shell.tsx
git rm frontend/components/dashboard/swarm-placeholder.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): wire swarm console into dashboard shell

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Update tasks.md + intelligence log

**Files:**
- Modify: `tasks.md`

- [ ] **Step 13.1: Flip Phase 3 items to `[x]`**

In `tasks.md` Phase 3:
- 3.1 → `[x]` with note: "Vertical AgentFlow (3 nodes Data Ingest → Yield Optimizer → Execution) with motion-driven state transitions and tool log streaming entries phase-by-phase."
- 3.2 → `[x]` with note: "Vendored Kokonut UI: ai-text-loading (tool log streaming text), ai-state-loading (active node reasoning indicator), beams-background (atmospheric backdrop in TNG blue/yellow at 14% opacity)."
- 3.3 → `[x]` with note: "shadcn Slider restyled with yellow track + ink thumb; live delta readout shows RM offer total against base RM 2,450."
- 3.4 → `[x]` with note: "ExecutionReceipt slides in on settled phase: ledger hash 0xa9f3b8e21c, discount %, net-to-wholesaler in display font, green success ring."

- [ ] **Step 13.2: Append intelligence-log entry (newest on top)**

Add this bullet at the top of the project intelligence log section:

```
- **2026-04-25** — Phase 3 done. Right rail now hosts the SwarmConsole orchestrator: SwarmBadge (active/settled state) → AgentFlow (3 nodes + animated SVG dashed connectors) → ToolLog (5 entries streamed across 4 phases) → YieldSlider (1.8%–4.0%, locked while running) → ExecutionReceipt (post-settle). State machine in `lib/swarm-machine.ts`, total run 5s. Vendored 3 Kokonut UI components into `components/ui/`. Initiate Swarm CTA inside the Execution node, doubles as Reset after settled. Skipped 21st.dev "Agent Plan" — hand-rolled SVG flow stayed truer to our blue/yellow palette. Wiring to Vercel AI SDK v6 is Phase 5; the ToolLog and AgentFlow already key off a `phase` prop, so swap-in is single-source. (Claude)
```

- [ ] **Step 13.3: Commit**

```bash
git add tasks.md
git commit -m "$(cat <<'EOF'
docs: mark phase 3 complete in tasks.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage (against [tasks.md](tasks.md) Phase 3 + design.md §8.7):**
- ✅ tasks.md 3.1 vertical stack of generative UI cards → Tasks 6, 7, 8
- ✅ tasks.md 3.2 Kokonut UI / 21st.dev components → Tasks 2, 3, 4 (3 from Kokonut; 21st.dev intentionally skipped, documented)
- ✅ tasks.md 3.3 yield arbitrage slider → Task 9
- ✅ tasks.md 3.4 execution receipt with timestamp + ledger hash + green check → Task 10
- ✅ design.md §8.7 SWARM ACTIVE pulsing badge → Task 5
- ✅ design.md §8.7 agent flow with dashed-line stroke animation → Task 7
- ✅ design.md §8.7 Initiate Swarm yellow CTA inside Execution node → Task 11
- ✅ design.md §8.7 tool log mono terminal feel, yellow ◉ marker on most recent → Task 8
- ✅ design.md §8.7 left border `--tng-blue` on the swarm panel → Task 11 (preserved from existing dashboard-shell layout)
- ✅ design.md §7.2 dashed connector animation → Task 7 (uses `animate-dash` keyframe already in globals.css)
- ✅ User direction: more blue + yellow → blue on agent borders, log timestamps, ledger hash; yellow on active states, CTA, success ring, beams accent

**Type consistency check:**
- `SwarmPhase` defined once in `swarm-machine.ts`, imported by `swarm-badge`, `swarm-console`, `agent-flow`, `tool-log` — consistent.
- `AgentSlot` and `AgentState` defined once, used in `agent-flow` and `agent-node` — consistent.
- `AgentMeta` exported from `mock-data.ts`, imported by `agent-node` — consistent.
- `ToolCall.appearAt` matches `SwarmPhase` minus `idle` — verified via type narrowing in `tool-log.tsx`.
- `agentStateFor()` and `connectorStateFor()` signatures used identically across `agent-flow.tsx` — consistent.

**No-placeholder scan:** every code step contains complete code, no "TBD" or "similar to". Connector x-coordinates and SVG viewBox are real values. ✅

**Hackathon-mode adherence (per [CLAUDE.md](CLAUDE.md)):**
- ❌ Zero unit tests (intentional)
- ❌ Zero error boundaries (intentional)
- ✅ Verify-by-clicking captured (user does it after Task 12)
- ✅ Frequent commits, one per task

**Risks I'm flagging:**
- The Kokonut install URLs are best-guesses (`https://kokonutui.com/r/<slug>.json`). If the slugs differ, Tasks 2/3/4 fall back to the inline implementations provided — the swarm console works either way.
- shadcn Slider's `data-slot` attribute names depend on the version vendored in Phase 0. If `[&_[data-slot=slider-track]]` selectors don't apply, fix by inspecting `frontend/components/ui/slider.tsx`. Listed as a note in Task 9.2.
- `motion@12` in React 19 with RSC — confirmed working in Phase 2 (KPI cards). No regression expected.

---

## Execution Handoff

**Plan complete and saved to `plan-phase-3.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
