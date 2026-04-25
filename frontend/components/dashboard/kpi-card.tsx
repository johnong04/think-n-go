"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/mock-data";

type Props = Kpi & { index: number };

export function KpiCard({ caption, value, trend, livePulse, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.16 + index * 0.08,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={cn(
        "group relative flex flex-col justify-between border border-stroke-soft bg-card p-6 transition-colors",
        "hover:border-stroke"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {caption}
        </span>
        {livePulse && (
          <span className="size-1.5 animate-swarm-pulse rounded-full bg-tng-yellow" />
        )}
      </div>
      <div className="mt-6 font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-ink">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowUpRight className="size-3" />
        {trend}
      </div>
    </motion.div>
  );
}
