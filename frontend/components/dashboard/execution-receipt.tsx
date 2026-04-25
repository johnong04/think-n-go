"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { ledgerHash, formatRm, yieldOffer } from "@/lib/mock-data";

type Props = {
  yieldPercent: number;
};

export function ExecutionReceipt({ yieldPercent }: Props) {
  const settlementAmount = Math.round(yieldOffer.baseAmount * (1 - yieldPercent / 100));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative flex flex-col gap-3 border-2 border-tng-blue bg-card p-4 shadow-[0_0_0_4px_color-mix(in_oklab,var(--tng-blue)_18%,transparent)]"
    >
      <header className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-tng-blue-deep">
        <CheckCircle2 className="size-4 text-up" />
        settled
      </header>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">ledger</span>
        <span className="text-right text-tng-blue-deep">{ledgerHash}</span>

        <span className="text-muted-foreground">discount</span>
        <span className="text-right text-ink tabular-nums">{yieldPercent.toFixed(1)}%</span>

        <span className="text-muted-foreground">net to wholesaler</span>
        <span className="text-right font-display text-base font-bold text-ink">{formatRm(settlementAmount)}</span>
      </div>
    </motion.section>
  );
}
