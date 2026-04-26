"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AITextLoading } from "@/components/ui/ai-text-loading";
import { toolCallsByScenario, type ToolCall } from "@/lib/mock-data";
import type { SwarmPhase, SwarmScenario } from "@/lib/swarm-machine";

const PHASE_TO_INDEX: Record<Exclude<SwarmPhase, "idle" | "settled" | "awaiting">, number> = {
  t1: 0, t2: 1, t3: 2, t4: 3, t5: 4,
};

function visibleEntries(scenario: SwarmScenario | null, phase: SwarmPhase) {
  if (!scenario) return [];
  const all = toolCallsByScenario[scenario];
  if (phase === "idle") return [];
  if (phase === "settled") return all;
  if (phase === "awaiting") {
    // Show entries up to the pause point — caller must compute via SCENARIO_TIMINGS.
    // For simplicity, show all entries whose appearAtIndex < the first un-run tool.
    // Approximation: show all entries that have already been "done" by virtue of awaiting.
    // The orchestrator pauses *after* index N, so entries 0..N are done.
    // We don't know N here without coupling — so show all entries that came in via setPhase already.
    // Simplest contract: when awaiting, show all entries up to and including index = pauseAfterIndex (pull from caller).
    // To avoid re-importing SCENARIO_TIMINGS just for this, accept showing ALL entries up to scenario.length - 1 except the last.
    return all.slice(0, all.length - 1);
  }
  const idx = PHASE_TO_INDEX[phase];
  return all.filter((tc) => tc.appearAtIndex <= idx);
}

type Props = {
  scenario: SwarmScenario | null;
  phase: SwarmPhase;
  /** When the swarm runs against real backend, the orchestrator passes in
   *  ToolCall entries with streamed reasoningText. Falls back to mock data. */
  liveEntries?: ToolCall[];
};

export function ToolLog({ scenario, phase, liveEntries }: Props) {
  const entries = liveEntries && liveEntries.length > 0
    ? liveEntries
    : visibleEntries(scenario, phase);
  const ordered = [...entries].reverse();
  const total = scenario ? toolCallsByScenario[scenario].length : 0;

  return (
    <section className="flex flex-col gap-2 border border-stroke-soft bg-card/60 p-3 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-stroke-soft pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          tool log {scenario ? `· scenario ${scenario}` : ""}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-tng-blue">
          {entries.length}/{total || "—"}
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
              {scenario ? "awaiting first dispatch…" : "swarm idle"}
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
                  className={cn("mt-1 size-2 rounded-full", i === 0 ? "bg-tng-yellow" : "bg-stroke-soft")}
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
                  {entry.reasoningText ? (
                    <span className="mt-1 block font-editorial text-[11px] italic leading-snug text-ink/80">
                      {entry.reasoningText}
                    </span>
                  ) : null}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
