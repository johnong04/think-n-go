"use client";

import { motion, AnimatePresence } from "motion/react";
import { TrendingDown, Sparkles, CheckCircle2 } from "lucide-react";
import { shortfallCopy, type ShortfallState } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  state: ShortfallState;
  onTrigger: () => void;
};

export function ShortfallAlert({ state, onTrigger }: Props) {
  const copy = shortfallCopy[state];
  const Icon = state === "open" ? TrendingDown : state === "in-flight" ? Sparkles : CheckCircle2;
  const accent =
    state === "open"
      ? "border-down bg-down/5"
      : state === "in-flight"
        ? "border-tng-yellow bg-tng-yellow-tint"
        : "border-up bg-up/5";

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={state}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "flex items-center justify-between gap-4 border-l-4 border-y border-r border-l-current bg-card p-4",
          accent
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-md",
              state === "open" && "bg-down/10 text-down",
              state === "in-flight" && "bg-tng-yellow text-ink",
              state === "resolved" && "bg-up/10 text-up"
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold leading-tight text-ink">{copy.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{copy.body}</p>
          </div>
        </div>
        {copy.cta && (
          <button
            type="button"
            onClick={onTrigger}
            className="shrink-0 bg-tng-yellow px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-tng-yellow/90"
          >
            {copy.cta}
          </button>
        )}
      </motion.section>
    </AnimatePresence>
  );
}
