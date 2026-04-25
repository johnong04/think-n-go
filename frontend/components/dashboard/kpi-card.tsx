"use client";

import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import type { KpiV2 } from "@/lib/mock-data";

type Props = KpiV2 & { index: number };

export function KpiCard({ caption, value, delta, trend, spark, livePulse, index }: Props) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 + index * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group relative flex flex-col justify-between gap-3 border border-stroke-soft bg-card p-5 transition-colors",
        "hover:border-stroke"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {caption}
        </span>
        {livePulse && <span className="size-1.5 animate-swarm-pulse rounded-full bg-tng-yellow" />}
      </div>
      <div>
        <div className="font-display text-[36px] font-bold leading-none tracking-[-0.02em] text-ink">
          {value}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendIcon className={cn("size-3", trend === "up" ? "text-up" : "text-down")} />
          {delta}
        </div>
      </div>
      <Sparkline data={spark} trend={trend} className="-mb-1 -mx-1 opacity-70" />
    </motion.div>
  );
}
