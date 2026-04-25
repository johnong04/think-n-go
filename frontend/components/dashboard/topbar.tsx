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
