"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import {
  connectorStateFor,
  toolStateFor,
  type SwarmPhase,
} from "@/lib/swarm-machine";
import type { ToolMeta } from "@/lib/mock-data";
import { AgentBanner } from "./agent-banner";
import { ToolNode } from "./tool-node";
import { FlowConnector } from "./flow-connector";
import { ReasoningBubble } from "./reasoning-bubble";

type Props = {
  /** Ordered tool list for the active scenario. Empty array = idle (show placeholder). */
  tools: ToolMeta[];
  phase: SwarmPhase;
  /** Tool index after which the swarm pauses awaiting a mobile event (informs awaiting-state cursor). */
  pauseAfterIndex?: number;
};

type Group = {
  agent: "wholesaler" | "merchant";
  tools: ToolMeta[];
};

function groupConsecutive(tools: ToolMeta[]): Group[] {
  const out: Group[] = [];
  for (const t of tools) {
    const last = out[out.length - 1];
    if (last && last.agent === t.agent) {
      last.tools.push(t);
    } else {
      out.push({ agent: t.agent, tools: [t] });
    }
  }
  return out;
}

function isReached(toolPhase: ToolMeta["phase"], currentPhase: SwarmPhase, pauseAfterIndex: number, tools: ToolMeta[]): boolean {
  if (currentPhase === "idle") return false;
  if (currentPhase === "settled") return true;
  if (currentPhase === "awaiting") {
    // All tools up to and including pauseAfterIndex are "reached"
    const meIdx = tools.findIndex((t) => t.phase === toolPhase);
    return meIdx >= 0 && meIdx <= pauseAfterIndex;
  }
  // Plain t1..t5 phase
  const order = ["t1", "t2", "t3", "t4", "t5"] as const;
  return order.indexOf(currentPhase) >= order.indexOf(toolPhase);
}

export function AgentFlow({ tools, phase, pauseAfterIndex = -1 }: Props) {
  const groups = groupConsecutive(tools);

  // Resolve the awaitingAfter cursor (last completed tool's phase) for state helpers
  const awaitingAfter =
    phase === "awaiting" && pauseAfterIndex >= 0
      ? (tools[pauseAfterIndex]?.phase ?? null)
      : null;

  if (tools.length === 0 || phase === "idle") {
    return (
      <div className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-dashed border-stroke-soft bg-paper-grid/50 px-4 py-6 text-center"
        >
          <Sparkles className="size-4 text-muted-foreground" />
          <p className="font-editorial text-sm italic leading-snug text-muted-foreground">
            Swarm idle. Trigger a scenario to dispatch agents.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, gi) => {
        const groupActive = group.tools.some(
          (t) => toolStateFor(t.phase, phase, awaitingAfter) === "active"
        );

        return (
          <div key={`group-${gi}-${group.agent}`} className="flex flex-col gap-2">
            {/* Cross-agent handoff connector before non-first group */}
            {gi > 0 && (
              <AnimatePresence>
                {isReached(group.tools[0].phase, phase, pauseAfterIndex, tools) && (
                  <FlowConnector
                    state={connectorStateFor(
                      group.tools[0].phase as Exclude<SwarmPhase, "idle" | "settled" | "awaiting" | "t1">,
                      phase,
                      awaitingAfter
                    )}
                    variant="handoff"
                  />
                )}
              </AnimatePresence>
            )}

            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <AgentBanner agent={group.agent} isActive={groupActive} />
            </motion.div>

            <AnimatePresence mode="popLayout">
              {group.tools.map((tool, i) => {
                if (!isReached(tool.phase, phase, pauseAfterIndex, tools)) return null;
                const state = toolStateFor(tool.phase, phase, awaitingAfter);
                return (
                  <motion.div key={tool.phase} layout className="flex flex-col gap-2">
                    {i > 0 && (
                      <FlowConnector
                        state={connectorStateFor(
                          tool.phase as Exclude<SwarmPhase, "idle" | "settled" | "awaiting" | "t1">,
                          phase,
                          awaitingAfter
                        )}
                      />
                    )}
                    <ToolNode tool={tool} state={state} />
                    <AnimatePresence>
                      {state === "active" && tool.reasoning && (
                        <ReasoningBubble key={`reasoning-${tool.phase}`} text={tool.reasoning} />
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
