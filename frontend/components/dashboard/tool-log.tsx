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
        <AnimatePresence>
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
