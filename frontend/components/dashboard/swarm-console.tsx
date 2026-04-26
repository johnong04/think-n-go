"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { BeamsBackground } from "@/components/ui/beams-background";
import { SwarmBadge } from "./swarm-badge";
import { AgentFlow } from "./agent-flow";
import { ToolLog } from "./tool-log";
import { YieldSlider } from "./yield-slider";
import { ExecutionReceipt } from "./execution-receipt";
import {
  swarmToolsByScenario,
  toolCallsByScenario,
  yieldOffer,
  type ToolCall,
} from "@/lib/mock-data";
import {
  SCENARIO_TIMINGS,
  type SwarmPhase,
  type SwarmScenario,
} from "@/lib/swarm-machine";
import {
  useDemoBus,
  publish,
  BUS_CHANNEL,
  type BusEvent,
} from "@/lib/demo-bus";
import { streamText, type StreamHandle } from "@/lib/text-stream";
import {
  DEMO_IDS,
  postOptimizeDiscount,
  postAuditArbitrage,
  postTriggerSettlement,
  getAnalyzeVelocity,
  type AuditArbitrageResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  scenario: SwarmScenario | null;
  phase: SwarmPhase;
  onScenarioChange: (s: SwarmScenario | null) => void;
  onPhaseChange: (p: SwarmPhase) => void;
};

type WaitHandle = { promise: Promise<void>; abort: () => void };

function sleep(ms: number, signal?: { aborted: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(), ms);
    if (signal) {
      const check = setInterval(() => {
        if (signal.aborted) {
          clearTimeout(t);
          clearInterval(check);
          resolve();
        }
      }, 50);
      // also auto-clear interval when timeout fires
      setTimeout(() => clearInterval(check), ms + 60);
    }
  });
}

/** Cancellable wait for a single bus event by type. */
function waitForBus(eventType: BusEvent["type"]): WaitHandle {
  let resolved = false;
  let resolveFn: () => void = () => {};
  const ch = typeof window !== "undefined" ? new BroadcastChannel(BUS_CHANNEL) : null;
  const promise = new Promise<void>((resolve) => {
    resolveFn = () => {
      if (resolved) return;
      resolved = true;
      try { ch?.close(); } catch { /* channel already closed */ }
      resolve();
    };
    if (!ch) {
      resolveFn();
      return;
    }
    ch.onmessage = (e: MessageEvent<BusEvent>) => {
      if (e.data?.type === eventType) {
        resolveFn();
      }
    };
  });
  return { promise, abort: resolveFn };
}

export function SwarmConsole({ scenario, phase, onScenarioChange, onPhaseChange }: Props) {
  const [yieldPct, setYieldPct] = useState<number>(yieldOffer.default);
  const [liveEntries, setLiveEntries] = useState<ToolCall[]>([]);
  const [receipt, setReceipt] = useState<{ ledgerHash: string; payoutRm: number; rebateRm: number } | null>(null);

  // Refs for runner control
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  // Runner-state refs (for cancellation)
  const runningRef = useRef<boolean>(false);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });
  const activeStreamRef = useRef<StreamHandle | null>(null);
  const activeWaitRef = useRef<WaitHandle | null>(null);

  const setPhase = useCallback((p: SwarmPhase) => {
    onPhaseChange(p);
  }, [onPhaseChange]);

  const setScenario = useCallback((s: SwarmScenario | null) => {
    onScenarioChange(s);
  }, [onScenarioChange]);

  const pushEntry = useCallback((base: ToolCall, reasoningText: string) => {
    setLiveEntries((prev) => [...prev, { ...base, reasoningText }]);
  }, []);

  const streamEntry = useCallback(
    async (base: ToolCall, reasoningText: string) => {
      // Push empty entry first
      setLiveEntries((prev) => [...prev, { ...base, reasoningText: "" }]);
      await new Promise<void>((resolve) => {
        const handle = streamText(reasoningText, (textSoFar) => {
          setLiveEntries((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], reasoningText: textSoFar };
            return next;
          });
        });
        activeStreamRef.current = handle;
        handle.promise.then(() => {
          activeStreamRef.current = null;
          resolve();
        });
      });
    },
    []
  );

  const cancelInFlight = useCallback(() => {
    abortRef.current.aborted = true;
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
    if (activeWaitRef.current) {
      activeWaitRef.current.abort();
      activeWaitRef.current = null;
    }
  }, []);

  const runScenarioA = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = { aborted: false };
    const signal = abortRef.current;

    try {
      const baseEntries = toolCallsByScenario.A;
      setLiveEntries([]);
      setReceipt(null);

      // Phase t1: scan ledger (deterministic)
      setPhase("t1");
      pushEntry(baseEntries[0], "Scanning Supabase for LOCKED escrows from healthy MSMEs.");
      await sleep(800, signal);
      if (signal.aborted) return;

      // Phase t2: optimize discount
      setPhase("t2");
      let optimizeResp;
      try {
        optimizeResp = await postOptimizeDiscount({
          supplier_id: DEMO_IDS.wholesaler,
          target_cash: 800,
        });
      } catch (err) {
        console.warn("optimize-discount failed; using fallback", err);
        optimizeResp = {
          suggested_discount_rate: "0.02",
          target_contracts: [],
          message: baseEntries[1].detail,
          reasoning_text: "2.0% discount nets RM 980 — covers RM 800 shortfall plus buffer.",
        };
      }
      if (signal.aborted) return;
      const optimizeContractId = optimizeResp.target_contracts[0] ?? null;
      await streamEntry(baseEntries[1], optimizeResp.reasoning_text);
      if (signal.aborted) return;

      // Phase t3: transmit (publish bus event to mobile)
      setPhase("t3");
      pushEntry(baseEntries[2], "Routing structured offer to merchant agent.");
      publish({
        type: "wholesaler:offer-sent",
        payload: {
          escrowId: optimizeContractId ?? "ESC-7142",
          discountPct: Number(optimizeResp.suggested_discount_rate) * 100,
          clientName: "Ahmad bin Yusof",
          offerAmountRm: 980,
        },
      });
      await sleep(400, signal);
      if (signal.aborted) return;

      // Pause for mobile accept
      setPhase("awaiting");
      const wait = waitForBus("merchant:offer-accepted");
      activeWaitRef.current = wait;
      await wait.promise;
      activeWaitRef.current = null;
      if (signal.aborted) return;

      // Phase t4: audit arbitrage
      setPhase("t4");
      let auditResp: AuditArbitrageResponse | null = null;
      if (optimizeContractId) {
        try {
          auditResp = await postAuditArbitrage({
            contract_id: optimizeContractId,
            discount_rate: 0.02,
          });
        } catch (err) {
          console.warn("audit-arbitrage failed; using fallback", err);
        }
      }
      if (signal.aborted) return;
      await streamEntry(
        baseEntries[3],
        auditResp?.reasoning_text ?? "+RM 18.50 vs holding 14d. ACCEPT."
      );
      if (signal.aborted) return;

      // Phase t5: trigger settlement
      setPhase("t5");
      if (optimizeContractId) {
        try {
          const settle = await postTriggerSettlement({
            contract_id: optimizeContractId,
            discount_rate: 0.02,
          });
          if (signal.aborted) return;
          setReceipt({
            ledgerHash: settle.ledger_hash,
            payoutRm: Number(settle.payout_to_supplier_rm),
            rebateRm: Number(settle.rebate_to_merchant_rm),
          });
          console.log("[swarm] settled · ledger_hash =", settle.ledger_hash);
          await streamEntry(baseEntries[4], settle.reasoning_text);
          if (signal.aborted) return;
          publish({
            type: "wholesaler:liquidity-received",
            payload: {
              escrowId: optimizeContractId,
              amountRm: Number(settle.payout_to_supplier_rm),
            },
          });
        } catch (err) {
          console.warn("settlement failed; using fallback receipt", err);
          setReceipt({ ledgerHash: "0xfallbackhash", payoutRm: 980, rebateRm: 20 });
          await streamEntry(
            baseEntries[4],
            "Settled atomically. Wholesaler +RM 980, merchant +RM 20."
          );
          publish({
            type: "wholesaler:liquidity-received",
            payload: { escrowId: optimizeContractId, amountRm: 980 },
          });
        }
      } else {
        // No real contract — synthesize a receipt so demo flow doesn't stall.
        setReceipt({ ledgerHash: "0xdemo-no-contract", payoutRm: 980, rebateRm: 20 });
        await streamEntry(
          baseEntries[4],
          "Settled atomically. Wholesaler +RM 980, merchant +RM 20."
        );
        publish({
          type: "wholesaler:liquidity-received",
          payload: { escrowId: "ESC-7142", amountRm: 980 },
        });
      }
      if (signal.aborted) return;

      setPhase("settled");
    } finally {
      runningRef.current = false;
    }
  }, [pushEntry, streamEntry, setPhase]);

  const runScenarioB = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = { aborted: false };
    const signal = abortRef.current;

    try {
      const baseEntries = toolCallsByScenario.B;
      setLiveEntries([]);
      setReceipt(null);

      // Phase t1: predict demand
      setPhase("t1");
      let velocity;
      try {
        velocity = await getAnalyzeVelocity(DEMO_IDS.merchants.ahmad);
      } catch (err) {
        console.warn("analyze-velocity failed", err);
        velocity = {
          merchant_id: DEMO_IDS.merchants.ahmad,
          predicted_shortfall_hours: 72,
          message: baseEntries[0].detail,
          reasoning_text: "Ayam gepuk velocity +18% w/w · stockout in ~3 days.",
        };
      }
      if (signal.aborted) return;
      await streamEntry(baseEntries[0], velocity.reasoning_text);
      if (signal.aborted) return;

      // Phase t2: visualize underwriting
      setPhase("t2");
      await streamEntry(
        baseEntries[1],
        "Approved RM 500 BNPL · RM 500 cash · 30d QR velocity RM 18,400 supports repayment via 5% sweep."
      );
      if (signal.aborted) return;

      // Pause for mobile to lock the escrow
      setPhase("awaiting");
      const wait = waitForBus("merchant:escrow-locked");
      activeWaitRef.current = wait;
      await wait.promise;
      activeWaitRef.current = null;
      if (signal.aborted) return;

      // Phase t3: lock confirmed
      setPhase("t3");
      await streamEntry(baseEntries[2], "Mixed-fund escrow LOCKED · NET-14 · RM 1,000 secured.");
      if (signal.aborted) return;

      // Phase t4: dispatch ready
      setPhase("t4");
      await streamEntry(baseEntries[3], "Verified · ready for dispatch.");
      if (signal.aborted) return;

      setPhase("settled");
    } finally {
      runningRef.current = false;
    }
  }, [streamEntry, setPhase]);

  // === Bus subscriptions ===

  useDemoBus(
    useCallback(
      (event) => {
        const ph = phaseRef.current;

        // System reset — cancels everything.
        if (event.type === "system:reset") {
          cancelInFlight();
          setLiveEntries([]);
          setReceipt(null);
          setScenario(null);
          setPhase("idle");
          runningRef.current = false;
          return;
        }

        // Scenario A trigger
        if (event.type === "wholesaler:liquidation-triggered" && ph === "idle" && !runningRef.current) {
          setScenario("A");
          void runScenarioA();
          return;
        }

        // Scenario B trigger
        if (event.type === "merchant:bnpl-funded" && ph === "idle" && !runningRef.current) {
          setScenario("B");
          void runScenarioB();
          return;
        }

        // Note: merchant:offer-accepted and merchant:escrow-locked are awaited
        // inside the runners via waitForBus(); no resume handler needed here.
      },
      [cancelInFlight, runScenarioA, runScenarioB, setPhase, setScenario]
    )
  );

  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  const cfg = scenario ? SCENARIO_TIMINGS[scenario] : null;
  const tools = scenario ? swarmToolsByScenario[scenario] : [];
  const totalRunMs = cfg ? cfg.durationsMs.reduce((a, b) => a + b, 0) : 0;

  const isRunning = phase !== "idle" && phase !== "settled";
  const isAwaiting = phase === "awaiting";

  return (
    <aside className="relative flex h-full flex-col overflow-hidden border-l border-tng-blue bg-gradient-to-b from-paper to-tng-blue-tint">
      <BeamsBackground intensity={0.14} />

      <div className="relative flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <SwarmBadge phase={phase} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {phase === "idle"
              ? "ready"
              : phase === "settled"
                ? "done"
                : isAwaiting
                  ? `awaiting · ${cfg?.resumeOn === "merchant:offer-accepted" ? "ahmad" : "lock"}`
                  : `live · ${(totalRunMs / 1000).toFixed(1)}s run`}
            {scenario && ` · scenario ${scenario}`}
          </span>
        </div>

        <AgentFlow
          tools={tools}
          phase={phase}
          pauseAfterIndex={cfg?.pauseAfterIndex ?? -1}
        />

        <div className="mt-2">
          <div
            className={cn(
              "rounded-lg border border-stroke-soft px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.1em]",
              phase === "settled" ? "text-muted-foreground" : "text-ink"
            )}
          >
            {phase === "settled"
              ? "settled · use footer reset"
              : phase === "idle"
                ? "triggered from dashboard"
                : isAwaiting
                  ? "awaiting mobile…"
                  : "running…"}
          </div>
        </div>

        <ToolLog scenario={scenario} phase={phase} liveEntries={liveEntries} />

        <YieldSlider value={yieldPct} onChange={setYieldPct} disabled={isRunning} />

        <AnimatePresence>
          {phase === "settled" && scenario === "A" && (
            <ExecutionReceipt key="receipt" yieldPercent={receipt ? 2.0 : yieldPct} />
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
