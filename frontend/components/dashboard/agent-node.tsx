"use client";

import { motion } from "motion/react";
import { Database, TrendingUp, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIStateLoading } from "@/components/ui/ai-state-loading";
import type { AgentMeta } from "@/lib/mock-data";
import type { AgentState } from "@/lib/swarm-machine";

const ICONS = {
  ingest: Database,
  optimize: TrendingUp,
  execute: Zap,
} as const;

type Props = {
  agent: AgentMeta;
  state: AgentState;
  /** Only present on the execute node */
  cta?: React.ReactNode;
};

export function AgentNode({ agent, state, cta }: Props) {
  const Icon = ICONS[agent.slot];
  const isActive = state === "active";
  const isDone = state === "done";

  return (
    <motion.div
      layout
      animate={{
        borderColor: isActive ? "var(--tng-yellow)" : isDone ? "var(--tng-blue)" : "var(--stroke-soft)",
        boxShadow: isActive ? "0 0 0 4px var(--swarm-glow)" : "0 0 0 0 transparent",
      }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative flex flex-col gap-3 border bg-card p-4",
        isDone && "bg-tng-blue-tint/40"
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-8 place-items-center transition-colors",
              isActive ? "bg-tng-yellow text-ink" : isDone ? "bg-tng-blue text-paper" : "bg-paper-grid text-muted-foreground"
            )}
          >
            {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
          </span>
          <div>
            <h3 className="font-display text-sm font-bold leading-none tracking-tight text-ink">
              {agent.title}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {agent.subtitle}
            </p>
          </div>
        </div>
      </header>

      {isActive && (
        <div className="flex items-center justify-between border-t border-stroke-soft pt-3">
          <span className="font-mono text-[11px] text-tng-blue-deep">{agent.metric}</span>
          <AIStateLoading />
        </div>
      )}

      {isDone && (
        <div className="flex items-center justify-between border-t border-stroke-soft pt-3 font-mono text-[11px] text-up">
          <span>{agent.metric}</span>
          <span className="uppercase tracking-[0.08em]">complete</span>
        </div>
      )}

      {cta && <div className="border-t border-stroke-soft pt-3">{cta}</div>}
    </motion.div>
  );
}
