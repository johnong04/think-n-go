export type SwarmPhase = "idle" | "ingesting" | "optimizing" | "executing" | "settled";

export type AgentSlot = "ingest" | "optimize" | "execute";

export type AgentState = "idle" | "active" | "done";

export type ConnectorState = "idle" | "active" | "done";

export const PHASE_TIMINGS_MS = {
  ingesting: 0,
  optimizing: 1500,
  executing: 3000,
  settled: 4500,
} as const;

export const TOTAL_RUN_MS = 5000;

export function agentStateFor(slot: AgentSlot, phase: SwarmPhase): AgentState {
  const order: SwarmPhase[] = ["idle", "ingesting", "optimizing", "executing", "settled"];
  const phaseIdx = order.indexOf(phase);
  const slotIdx: Record<AgentSlot, number> = { ingest: 1, optimize: 2, execute: 3 };
  const me = slotIdx[slot];
  if (phaseIdx < me) return "idle";
  if (phaseIdx === me) return "active";
  return "done";
}

export function connectorStateFor(below: AgentSlot, phase: SwarmPhase): ConnectorState {
  const above = below === "optimize" ? "ingest" : "optimize";
  const aboveState = agentStateFor(above, phase);
  if (aboveState === "active") return "active";
  if (aboveState === "done") return "done";
  return "idle";
}
