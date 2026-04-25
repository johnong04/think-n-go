"use client";

import { motion } from "motion/react";
import { Check, Search, Calculator, Send, Brain, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIStateLoading } from "@/components/ui/ai-state-loading";
import type { ToolMeta } from "@/lib/mock-data";
import type { ToolState } from "@/lib/swarm-machine";

const ICONS = {
  search: Search,
  calculator: Calculator,
  send: Send,
  brain: Brain,
  "shield-check": ShieldCheck,
} as const;

type Props = {
  tool: ToolMeta;
  state: ToolState;
};

export function ToolNode({ tool, state }: Props) {
  const Icon = ICONS[tool.iconKey];
  const isActive = state === "active";
  const isDone = state === "done";

  return (
    <motion.div
      layout
      animate={{
        borderColor: isActive
          ? "var(--tng-yellow)"
          : isDone
            ? "var(--tng-blue)"
            : "var(--stroke-soft)",
        boxShadow: isActive
          ? "0 0 0 4px var(--swarm-glow), 0 8px 20px -8px rgba(10,14,39,0.18)"
          : isDone
            ? "0 1px 0 rgba(0,0,0,0.04)"
            : "0 1px 0 rgba(0,0,0,0.04)",
      }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative flex items-stretch overflow-visible rounded-md border bg-card"
    >
      {/* Input port (top center) */}
      <span
        className={cn(
          "absolute left-1/2 top-[-6px] size-3 -translate-x-1/2 rounded-full border-2 border-card transition-colors",
          isActive || isDone ? "bg-tng-blue" : "bg-stroke-soft"
        )}
        aria-hidden="true"
      />
      {/* Output port (bottom center) */}
      <span
        className={cn(
          "absolute left-1/2 bottom-[-6px] size-3 -translate-x-1/2 rounded-full border-2 border-card transition-colors",
          isDone ? "bg-tng-blue" : isActive ? "bg-tng-yellow" : "bg-stroke-soft"
        )}
        aria-hidden="true"
      />

      {/* Icon column */}
      <div
        className={cn(
          "grid w-12 shrink-0 place-items-center rounded-l-md border-r border-stroke-soft transition-colors",
          isActive
            ? "bg-tng-yellow text-ink"
            : isDone
              ? "bg-tng-blue text-paper"
              : "bg-paper-grid text-tng-blue-app"
        )}
      >
        {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-center gap-1 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[12px] font-medium text-ink">{tool.name}</span>
          {isActive && <AIStateLoading label="thinking" />}
          {isDone && (
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-up">done</span>
          )}
          {!isActive && !isDone && (
            <span className="rounded-sm bg-paper-grid px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              {tool.scenarioTag}
            </span>
          )}
        </div>
        <span className="text-[11px] leading-snug text-muted-foreground">{tool.description}</span>
        {(isActive || isDone) && (
          <span
            className={cn(
              "font-mono text-[10px]",
              isActive ? "text-tng-blue-deep" : "text-tng-blue"
            )}
          >
            {tool.output}
          </span>
        )}
      </div>
    </motion.div>
  );
}
