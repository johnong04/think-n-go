export type SwarmPhase = "idle" | "t1" | "t2" | "t3" | "t4" | "t5" | "settled";

export const PHASE_ORDER: SwarmPhase[] = ["idle", "t1", "t2", "t3", "t4", "t5", "settled"];

export const PHASE_DURATION_MS: Record<Exclude<SwarmPhase, "idle" | "settled">, number> = {
  t1: 1000,
  t2: 1000,
  t3: 1200, // includes cross-agent handoff
  t4: 1400, // reasoning is shown here, slightly longer
  t5: 1000,
};

export const TOTAL_RUN_MS = Object.values(PHASE_DURATION_MS).reduce((a, b) => a + b, 0);

/** Cumulative offsets to use with setTimeout */
export function phaseOffsetMs(target: SwarmPhase): number {
  if (target === "idle") return 0;
  if (target === "settled") return TOTAL_RUN_MS;
  let acc = 0;
  for (const p of ["t1", "t2", "t3", "t4", "t5"] as const) {
    if (p === target) return acc;
    acc += PHASE_DURATION_MS[p];
  }
  return acc;
}

export type ToolState = "idle" | "active" | "done";

export function toolStateFor(
  toolPhase: Exclude<SwarmPhase, "idle" | "settled">,
  currentPhase: SwarmPhase
): ToolState {
  const ci = PHASE_ORDER.indexOf(currentPhase);
  const ti = PHASE_ORDER.indexOf(toolPhase);
  if (ci < ti) return "idle";
  if (ci === ti) return "active";
  return "done";
}

export type ConnectorState = "idle" | "active" | "done";

export function connectorStateFor(
  belowToolPhase: Exclude<SwarmPhase, "idle" | "settled" | "t1">,
  currentPhase: SwarmPhase
): ConnectorState {
  const order: SwarmPhase[] = ["t1", "t2", "t3", "t4", "t5"];
  const idx = order.indexOf(belowToolPhase);
  if (idx <= 0) return "idle";
  const prev = order[idx - 1];
  const prevState = toolStateFor(prev as Exclude<SwarmPhase, "idle" | "settled">, currentPhase);
  const meState = toolStateFor(belowToolPhase, currentPhase);
  if (meState === "active") return "active";
  if (prevState === "done" && meState === "done") return "done";
  return "idle";
}
