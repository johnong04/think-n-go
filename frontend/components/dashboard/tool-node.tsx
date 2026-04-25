"use client";

import { motion } from "motion/react";
import { Brain, Calculator, Check, Cpu, Lock, Receipt, Search, Send, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
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
  "trending-up": TrendingUp,
  wallet: Wallet,
  lock: Lock,
  receipt: Receipt,
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
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        borderColor: isActive
          ? "var(--tng-yellow)"
          : isDone
            ? "var(--tng-blue)"
            : "var(--stroke-soft)",
        boxShadow: isActive
          ? "0 0 0 4px var(--swarm-glow), 0 12px 28px -10px rgba(10,14,39,0.22)"
          : isDone
            ? "0 1px 0 rgba(0,0,0,0.04)"
            : "0 1px 0 rgba(0,0,0,0.04)",
      }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative"
    >
      {/* Input port (top center) */}
      <span
        className={cn(
          "absolute left-1/2 top-[-6px] z-10 size-3 -translate-x-1/2 rounded-full border-2 border-paper transition-colors",
          isActive || isDone ? "bg-tng-blue" : "bg-stroke-soft"
        )}
        aria-hidden="true"
      />
      {/* Output port (bottom center) */}
      <span
        className={cn(
          "absolute left-1/2 bottom-[-6px] z-10 size-3 -translate-x-1/2 rounded-full border-2 border-paper transition-colors",
          isDone ? "bg-tng-blue" : isActive ? "bg-tng-yellow" : "bg-stroke-soft"
        )}
        aria-hidden="true"
      />

      <div className="flex items-stretch overflow-hidden rounded-xl border bg-card">
        {/* Icon column — bigger and more prominent */}
        <div
          className={cn(
            "grid w-14 shrink-0 place-items-center border-r border-stroke-soft transition-colors",
            isActive
              ? "bg-tng-yellow text-ink"
              : isDone
                ? "bg-tng-blue text-paper"
                : "bg-paper-grid text-tng-blue-app"
          )}
        >
          {isDone ? <Check className="size-5" /> : <Icon className="size-5" />}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-center gap-1 px-3.5 py-3">
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
          <span className="text-[11px] leading-snug text-muted-foreground">
            {tool.description}
          </span>
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
      </div>

      {/* Dangling engine pill — n8n signature touch */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.32 }}
        className="absolute -bottom-3 left-14 flex items-center"
      >
        <span className="h-2 w-px bg-stroke-soft" aria-hidden="true" />
        <span
          className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px]",
            isActive
              ? "border-tng-yellow bg-tng-yellow-tint text-ink"
              : isDone
                ? "border-tng-blue bg-tng-blue-tint text-tng-blue-deep"
                : "border-stroke-soft bg-card text-muted-foreground"
          )}
        >
          <Cpu className="size-2.5" />
          {tool.engine}
        </span>
      </motion.div>
    </motion.div>
  );
}
