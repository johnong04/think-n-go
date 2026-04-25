"use client";

import { useState } from "react";
import { Topbar } from "./topbar";
import { SwarmConsole } from "./swarm-console";
import { ArbitrageBanner } from "./arbitrage-banner";
import type { Mode } from "@/lib/mock-data";
import type { SwarmPhase } from "@/lib/swarm-machine";

type Props = {
  staticContent: (mode: Mode) => React.ReactNode;
};

export function DashboardShell({ staticContent }: Props) {
  const [mode, setMode] = useState<Mode>("merchant");
  const [phase, setPhase] = useState<SwarmPhase>("idle");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar mode={mode} onModeChange={setMode} />
      <div className="grid flex-1 grid-cols-2">
        <main className="bg-grid flex flex-col gap-px bg-paper p-6">
          {staticContent(mode)}
          <ArbitrageBanner mode={mode} phase={phase} />
        </main>
        <SwarmConsole phase={phase} onPhaseChange={setPhase} />
      </div>
    </div>
  );
}
