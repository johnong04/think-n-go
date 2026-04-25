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
