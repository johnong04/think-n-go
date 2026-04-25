"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { swarmTools } from "@/lib/mock-data";
import { connectorStateFor, toolStateFor, PHASE_ORDER } from "@/lib/swarm-machine";
import type { SwarmPhase } from "@/lib/swarm-machine";
import { AgentBanner } from "./agent-banner";
import { ToolNode } from "./tool-node";
import { FlowConnector } from "./flow-connector";
import { ReasoningBubble } from "./reasoning-bubble";

type Props = {
  phase: SwarmPhase;
};

type SwarmTool = "t1" | "t2" | "t3" | "t4" | "t5";

/** A tool is "revealed" once the swarm phase has reached or passed it. */
function isReached(toolPhase: SwarmTool, currentPhase: SwarmPhase): boolean {
  return PHASE_ORDER.indexOf(currentPhase) >= PHASE_ORDER.indexOf(toolPhase);
}

export function AgentFlow({ phase }: Props) {
  const wholesalerTools = swarmTools.filter((t) => t.agent === "wholesaler");
  const merchantTools = swarmTools.filter((t) => t.agent === "merchant");

  const wholesalerActive = wholesalerTools.some(
    (t) => toolStateFor(t.phase, phase) === "active"
  );
  const merchantActive = merchantTools.some(
    (t) => toolStateFor(t.phase, phase) === "active"
  );

  // Handoff connector is visible once t3 is reached
  const handoffVisible = isReached("t3", phase);
  // Merchant banner is visible once handoff has fired (i.e., t4 is reached)
  const merchantBannerVisible = isReached("t4", phase);

  const isIdle = phase === "idle";

  return (
    <div className="flex flex-col gap-2">
      <AgentBanner agent="wholesaler" isActive={wholesalerActive} />

      <AnimatePresence mode="popLayout">
        {wholesalerTools.map((tool, i) =>
          isReached(tool.phase, phase) ? (
            <motion.div key={tool.phase} layout>
              {i > 0 && (
                <FlowConnector
                  state={connectorStateFor(
                    tool.phase as Exclude<SwarmPhase, "idle" | "settled" | "t1">,
                    phase
                  )}
                />
              )}
              <ToolNode tool={tool} state={toolStateFor(tool.phase, phase)} />
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      <AnimatePresence>
        {handoffVisible && (
          <FlowConnector state={connectorStateFor("t4", phase)} variant="handoff" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {merchantBannerVisible && (
          <motion.div
            key="merchant-banner"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <AgentBanner agent="merchant" isActive={merchantActive} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {merchantTools.map((tool, i) =>
          isReached(tool.phase, phase) ? (
            <motion.div key={tool.phase} layout className="flex flex-col gap-2">
              {i > 0 && (
                <FlowConnector
                  state={connectorStateFor(
                    tool.phase as Exclude<SwarmPhase, "idle" | "settled" | "t1">,
                    phase
                  )}
                />
              )}
              <ToolNode tool={tool} state={toolStateFor(tool.phase, phase)} />
              <AnimatePresence>
                {toolStateFor(tool.phase, phase) === "active" && tool.reasoning && (
                  <ReasoningBubble
                    key={`reasoning-${tool.phase}`}
                    text={tool.reasoning}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isIdle && (
          <motion.div
            key="idle-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-dashed border-stroke-soft bg-paper-grid/50 px-4 py-6 text-center"
          >
            <Sparkles className="size-4 text-muted-foreground" />
            <p className="font-editorial text-sm italic leading-snug text-muted-foreground">
              Ready to dispatch agents.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              5 tools · 2 agents · scenario A
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
