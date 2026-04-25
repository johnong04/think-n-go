export type SwarmScenario = "A" | "B";

/**
 * Phases:
 * - idle:     nothing running
 * - t1..t5:   tool index N active
 * - awaiting: paused mid-sequence waiting for a mobile event
 * - settled:  done
 */
export type SwarmPhase = "idle" | "t1" | "t2" | "t3" | "t4" | "t5" | "awaiting" | "settled";

export const PHASE_ORDER_BEFORE_AWAIT: SwarmPhase[] = ["idle", "t1", "t2", "t3", "t4", "t5", "settled"];

export type ToolState = "idle" | "active" | "done";

/**
 * Compute a tool's state given its phase id and the current swarm phase.
 * "awaiting" is treated as if the last-completed tool is the cursor — already-run tools are "done", later tools are "idle".
 */
export function toolStateFor(
  toolPhase: Exclude<SwarmPhase, "idle" | "settled" | "awaiting">,
  currentPhase: SwarmPhase,
  awaitingAfter: Exclude<SwarmPhase, "idle" | "settled" | "awaiting"> | null = null
): ToolState {
  if (currentPhase === "settled") return "done";
  if (currentPhase === "idle") return "idle";

  if (currentPhase === "awaiting") {
    if (!awaitingAfter) return "idle";
    const order: SwarmPhase[] = ["t1", "t2", "t3", "t4", "t5"];
    const cursorIdx = order.indexOf(awaitingAfter);
    const meIdx = order.indexOf(toolPhase);
    return meIdx <= cursorIdx ? "done" : "idle";
  }

  // Plain phase=t1..t5
  const order: SwarmPhase[] = ["t1", "t2", "t3", "t4", "t5"];
  const ci = order.indexOf(currentPhase);
  const ti = order.indexOf(toolPhase);
  if (ci < ti) return "idle";
  if (ci === ti) return "active";
  return "done";
}

export type ConnectorState = "idle" | "active" | "done";

export function connectorStateFor(
  belowToolPhase: Exclude<SwarmPhase, "idle" | "settled" | "awaiting" | "t1">,
  currentPhase: SwarmPhase,
  awaitingAfter: Exclude<SwarmPhase, "idle" | "settled" | "awaiting"> | null = null
): ConnectorState {
  const order: SwarmPhase[] = ["t1", "t2", "t3", "t4", "t5"];
  const myIdx = order.indexOf(belowToolPhase);
  const prev = order[myIdx - 1] as Exclude<SwarmPhase, "idle" | "settled" | "awaiting" | "t1">;

  const prevState = toolStateFor(prev, currentPhase, awaitingAfter);
  const meState = toolStateFor(belowToolPhase, currentPhase, awaitingAfter);

  if (meState === "active") return "active";
  if (prevState === "done" && meState === "done") return "done";
  return "idle";
}

/**
 * Per-scenario sequence config. Drives the SwarmConsole runner.
 *
 * - tools: ordered tool list (0-indexed)
 * - pauseAfterIndex: index of the tool after which the sequence pauses for a mobile event (0-indexed)
 * - resumeOn: bus event type that resumes the sequence
 * - durationsMs: per-tool active duration
 */
export type ScenarioConfig = {
  scenario: SwarmScenario;
  pauseAfterIndex: number;
  resumeOn: "merchant:offer-accepted" | "merchant:escrow-locked";
  durationsMs: number[];
};

export const SCENARIO_TIMINGS: Record<SwarmScenario, ScenarioConfig> = {
  A: {
    scenario: "A",
    pauseAfterIndex: 2,                     // pause after t3 (transmit)
    resumeOn: "merchant:offer-accepted",
    durationsMs: [1000, 1000, 1200, 1400, 1000], // t1..t5 active windows
  },
  B: {
    scenario: "B",
    pauseAfterIndex: 1,                     // pause after t2 (underwrite)
    resumeOn: "merchant:escrow-locked",
    durationsMs: [1000, 1200, 1200, 1000],   // t1..t4
  },
};
