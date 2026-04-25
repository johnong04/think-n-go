"use client";

import { AnimatePresence } from "motion/react";
import { swarmTools } from "@/lib/mock-data";
import { connectorStateFor, toolStateFor } from "@/lib/swarm-machine";
import type { SwarmPhase } from "@/lib/swarm-machine";
import { AgentBanner } from "./agent-banner";
import { ToolNode } from "./tool-node";
import { FlowConnector } from "./flow-connector";
import { ReasoningBubble } from "./reasoning-bubble";

type Props = {
  phase: SwarmPhase;
  ctaForExecute: React.ReactNode;
};

export function AgentFlow({ phase, ctaForExecute }: Props) {
  const wholesalerTools = swarmTools.filter((t) => t.agent === "wholesaler");
  const merchantTools = swarmTools.filter((t) => t.agent === "merchant");

  const wholesalerActive = wholesalerTools.some(
    (t) => toolStateFor(t.phase, phase) === "active"
  );
  const merchantActive = merchantTools.some(
    (t) => toolStateFor(t.phase, phase) === "active"
  );

  return (
    <div className="flex flex-col gap-2">
      <AgentBanner agent="wholesaler" isActive={wholesalerActive} />

      {wholesalerTools.map((tool, i) => (
        <div key={tool.phase}>
          {i > 0 && (
            <FlowConnector
              state={connectorStateFor(
                tool.phase as Exclude<SwarmPhase, "idle" | "settled" | "t1">,
                phase
              )}
            />
          )}
          <ToolNode tool={tool} state={toolStateFor(tool.phase, phase)} />
        </div>
      ))}

      {/* Cross-agent handoff — between t3 and t4 */}
      <FlowConnector state={connectorStateFor("t4", phase)} variant="handoff" />

      <AgentBanner agent="merchant" isActive={merchantActive} />

      {merchantTools.map((tool, i) => {
        const state = toolStateFor(tool.phase, phase);
        return (
          <div key={tool.phase}>
            {i > 0 && (
              <FlowConnector
                state={connectorStateFor(
                  tool.phase as Exclude<SwarmPhase, "idle" | "settled" | "t1">,
                  phase
                )}
              />
            )}
            <div className="flex items-start">
              <div className="flex-1">
                <ToolNode tool={tool} state={state} />
              </div>
              <AnimatePresence>
                {state === "active" && tool.reasoning && (
                  <ReasoningBubble key={`reasoning-${tool.phase}`} text={tool.reasoning} />
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      <div className="mt-2">{ctaForExecute}</div>
    </div>
  );
}
