"use client";

import { cn } from "@/lib/utils";
import { AgentNode } from "./agent-node";
import { agents } from "@/lib/mock-data";
import { agentStateFor, connectorStateFor } from "@/lib/swarm-machine";
import type { SwarmPhase } from "@/lib/swarm-machine";

type Props = {
  phase: SwarmPhase;
  ctaForExecute: React.ReactNode;
};

export function AgentFlow({ phase, ctaForExecute }: Props) {
  const ingest = agents.find((a) => a.slot === "ingest")!;
  const optimize = agents.find((a) => a.slot === "optimize")!;
  const execute = agents.find((a) => a.slot === "execute")!;

  return (
    <div className="flex flex-col">
      <AgentNode agent={ingest} state={agentStateFor("ingest", phase)} />
      <Connector state={connectorStateFor("optimize", phase)} />
      <AgentNode agent={optimize} state={agentStateFor("optimize", phase)} />
      <Connector state={connectorStateFor("execute", phase)} />
      <AgentNode agent={execute} state={agentStateFor("execute", phase)} cta={ctaForExecute} />
    </div>
  );
}

function Connector({ state }: { state: "idle" | "active" | "done" }) {
  const stroke =
    state === "active" ? "var(--tng-yellow)" : state === "done" ? "var(--tng-blue)" : "var(--stroke-soft)";
  return (
    <svg
      width="100%"
      height="36"
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="block"
    >
      <line
        x1="50"
        y1="0"
        x2="50"
        y2="36"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray={state === "active" ? "6 6" : "0"}
        className={cn(state === "active" && "animate-dash")}
      />
    </svg>
  );
}
