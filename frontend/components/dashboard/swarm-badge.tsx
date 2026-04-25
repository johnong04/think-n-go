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
