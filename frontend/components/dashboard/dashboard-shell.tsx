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
