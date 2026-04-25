"use client";

import { ModeSwitch } from "./mode-switch";
import type { Mode } from "@/lib/mock-data";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function Topbar({ mode, onModeChange }: Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-stroke-soft bg-paper px-6">
      <Wordmark />
      <ModeSwitch mode={mode} onChange={onModeChange} />
    </header>
  );
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-xl font-bold italic leading-none tracking-tight">
        <span className="text-ink">Think</span>
        <span className="text-tng-yellow">&apos;n </span>
        <span className="text-tng-blue">Go</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Agentic Liquidity
      </span>
    </div>
  );
}
