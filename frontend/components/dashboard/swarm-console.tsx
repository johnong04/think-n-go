"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { BeamsBackground } from "@/components/ui/beams-background";
import { SwarmBadge } from "./swarm-badge";
import { AgentFlow } from "./agent-flow";
import { ToolLog } from "./tool-log";
import { YieldSlider } from "./yield-slider";
import { ExecutionReceipt } from "./execution-receipt";
import {
  swarmToolsByScenario,
  yieldOffer,
} from "@/lib/mock-data";
import {
  SCENARIO_TIMINGS,
  type SwarmPhase,
  type SwarmScenario,
} from "@/lib/swarm-machine";
import { useDemoBus, publish } from "@/lib/demo-bus";
import { cn } from "@/lib/utils";

type Props = {
  scenario: SwarmScenario | null;
  phase: SwarmPhase;
  onScenarioChange: (s: SwarmScenario | null) => void;
  onPhaseChange: (p: SwarmPhase) => void;
};

export function SwarmConsole({ scenario, phase, onScenarioChange, onPhaseChange }: Props) {
  const [yieldPct, setYieldPct] = useState<number>(yieldOffer.default);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  /** Run from the start of the scenario up to and including the pause index, then set phase=awaiting. */
  const runUntilPause = useCallback(
    (sc: SwarmScenario) => {
      clearTimers();
      const cfg = SCENARIO_TIMINGS[sc];
      const tools = swarmToolsByScenario[sc];
      const stages = tools.slice(0, cfg.pauseAfterIndex + 1);

      // First tool fires immediately
      onPhaseChange(stages[0].phase);

      let offset = cfg.durationsMs[0];
      for (let i = 1; i < stages.length; i++) {
        const ph = stages[i].phase;
        timeouts.current.push(setTimeout(() => onPhaseChange(ph), offset));
        offset += cfg.durationsMs[i];
      }
      // After the last paused-stage's duration, pause
      timeouts.current.push(setTimeout(() => onPhaseChange("awaiting"), offset));
    },
    [onPhaseChange, clearTimers]
  );

  /** Resume after the pause, running remaining tools then settling. */
  const runAfterResume = useCallback(
    (sc: SwarmScenario) => {
      clearTimers();
      const cfg = SCENARIO_TIMINGS[sc];
      const tools = swarmToolsByScenario[sc];
      const stages = tools.slice(cfg.pauseAfterIndex + 1);
      if (stages.length === 0) {
        onPhaseChange("settled");
        return;
      }

      onPhaseChange(stages[0].phase);
      let offset = cfg.durationsMs[cfg.pauseAfterIndex + 1];
      for (let i = 1; i < stages.length; i++) {
        const ph = stages[i].phase;
        timeouts.current.push(setTimeout(() => onPhaseChange(ph), offset));
        offset += cfg.durationsMs[cfg.pauseAfterIndex + 1 + i];
      }
      timeouts.current.push(setTimeout(() => onPhaseChange("settled"), offset));
    },
    [onPhaseChange, clearTimers]
  );

  // === Bus subscriptions ===

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  useDemoBus(
    useCallback(
      (event) => {
        const ph = phaseRef.current;
        const sc = scenarioRef.current;

        // Scenario A trigger
        if (event.type === "wholesaler:liquidation-triggered" && ph === "idle") {
          onScenarioChange("A");
          runUntilPause("A");
          // After Scenario A's t3 fires, also publish the offer to mobile
          const cfg = SCENARIO_TIMINGS.A;
          const offset = cfg.durationsMs.slice(0, cfg.pauseAfterIndex + 1).reduce((a, b) => a + b, 0);
          timeouts.current.push(
            setTimeout(() => {
              publish({
                type: "wholesaler:offer-sent",
                payload: {
                  escrowId: "ESC-7142",
                  discountPct: 2.0,
                  clientName: "Ahmad bin Yusof",
                  offerAmountRm: 980,
                },
              });
            }, offset)
          );
          return;
        }

        // Scenario B trigger
        if (event.type === "merchant:bnpl-funded" && ph === "idle") {
          onScenarioChange("B");
          runUntilPause("B");
          return;
        }

        // Scenario A resume
        if (event.type === "merchant:offer-accepted" && ph === "awaiting" && sc === "A") {
          runAfterResume("A");
          // After settling, publish liquidity-received so the dashboard KPI ticks
          const cfg = SCENARIO_TIMINGS.A;
          const offset = cfg.durationsMs.slice(cfg.pauseAfterIndex + 1).reduce((a, b) => a + b, 0);
          timeouts.current.push(
            setTimeout(() => {
              publish({
                type: "wholesaler:liquidity-received",
                payload: { escrowId: "ESC-7142", amountRm: 980 },
              });
            }, offset)
          );
          return;
        }

        // Scenario B resume
        if (event.type === "merchant:escrow-locked" && ph === "awaiting" && sc === "B") {
          runAfterResume("B");
          return;
        }
      },
      [onScenarioChange, runUntilPause, runAfterResume]
    )
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  const cfg = scenario ? SCENARIO_TIMINGS[scenario] : null;
  const tools = scenario ? swarmToolsByScenario[scenario] : [];
  const totalRunMs = cfg ? cfg.durationsMs.reduce((a, b) => a + b, 0) : 0;

  const isRunning = phase !== "idle" && phase !== "settled";
  const isAwaiting = phase === "awaiting";

  function reset() {
    clearTimers();
    onScenarioChange(null);
    onPhaseChange("idle");
  }

  return (
    <aside className="relative flex h-full flex-col overflow-hidden border-l border-tng-blue bg-gradient-to-b from-paper to-tng-blue-tint">
      <BeamsBackground intensity={0.14} />

      <div className="relative flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <SwarmBadge phase={phase} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {phase === "idle"
              ? "ready"
              : phase === "settled"
                ? "done"
                : isAwaiting
                  ? `awaiting · ${cfg?.resumeOn === "merchant:offer-accepted" ? "ahmad" : "lock"}`
                  : `live · ${(totalRunMs / 1000).toFixed(1)}s run`}
            {scenario && ` · scenario ${scenario}`}
          </span>
        </div>

        <AgentFlow
          tools={tools}
          phase={phase}
          pauseAfterIndex={cfg?.pauseAfterIndex ?? -1}
        />

        <div className="mt-2">
          <button
            type="button"
            onClick={phase === "settled" ? reset : undefined}
            disabled={phase !== "settled"}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              phase === "settled"
                ? "bg-ink text-paper hover:bg-tng-blue-deep"
                : "cursor-not-allowed bg-paper-grid text-muted-foreground"
            )}
          >
            {phase === "settled" ? "Reset Demo" : phase === "idle" ? "Triggered from Dashboard" : isAwaiting ? "Awaiting mobile…" : "Running…"}
          </button>
        </div>

        <ToolLog scenario={scenario} phase={phase} />

        <YieldSlider value={yieldPct} onChange={setYieldPct} disabled={isRunning} />

        <AnimatePresence>
          {phase === "settled" && scenario === "A" && (
            <ExecutionReceipt key="receipt" yieldPercent={yieldPct} />
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
