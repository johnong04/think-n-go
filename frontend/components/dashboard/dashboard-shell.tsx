"use client";

import { useCallback, useState } from "react";
import { Topbar } from "./topbar";
import { SwarmConsole } from "./swarm-console";
import { ShortfallAlert } from "./shortfall-alert";
import { DashboardFooter } from "./dashboard-footer";
import { useDemoBus, publish } from "@/lib/demo-bus";
import type { SwarmPhase, SwarmScenario } from "@/lib/swarm-machine";
import type { ShortfallState } from "@/lib/mock-data";

type Props = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: Props) {
  const [scenario, setScenario] = useState<SwarmScenario | null>(null);
  const [phase, setPhase] = useState<SwarmPhase>("idle");
  const [shortfall, setShortfall] = useState<ShortfallState>("open");

  // Drive the shortfall banner from the swarm phase + scenario
  // (open before A starts, in-flight while A runs, resolved after A settles)
  // Scenario B doesn't change the shortfall banner.
  const updateShortfall = useCallback((s: SwarmScenario | null, p: SwarmPhase) => {
    if (s === "A") {
      if (p === "settled") setShortfall("resolved");
      else if (p !== "idle") setShortfall("in-flight");
      else setShortfall("open");
    }
  }, []);

  const handleScenario = useCallback(
    (s: SwarmScenario | null) => {
      setScenario(s);
      updateShortfall(s, phase);
    },
    [phase, updateShortfall]
  );

  const handlePhase = useCallback(
    (p: SwarmPhase) => {
      setPhase(p);
      updateShortfall(scenario, p);
    },
    [scenario, updateShortfall]
  );

  // Reset shortfall when reset is hit (scenario→null + phase→idle)
  const handleReset = useCallback(() => {
    setShortfall("open");
  }, []);

  // Subscribe for cross-window resolved confirmation (e.g., if another tab fires liquidity-received)
  useDemoBus(
    useCallback((event) => {
      if (event.type === "wholesaler:liquidity-received") {
        setShortfall("resolved");
      }
    }, [])
  );

  function triggerLiquidation() {
    publish({ type: "wholesaler:liquidation-triggered", payload: { shortfallRm: 800 } });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar />
      <div className="grid flex-1 grid-cols-2">
        <main className="bg-grid flex flex-col gap-4 bg-paper p-6">
          <ShortfallAlert state={shortfall} onTrigger={triggerLiquidation} />
          <div className="flex flex-col gap-px bg-stroke-soft">{children}</div>
        </main>
        <SwarmConsole
          scenario={scenario}
          phase={phase}
          onScenarioChange={(s) => {
            handleScenario(s);
            if (s === null) handleReset();
          }}
          onPhaseChange={handlePhase}
        />
      </div>
      <DashboardFooter />
    </div>
  );
}
