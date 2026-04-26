"use client";

import { useCallback, useEffect, useState } from "react";
import { KpiCard } from "./kpi-card";
import { useDemoBus } from "@/lib/demo-bus";
import { getDashboardKpis } from "@/lib/api";
import { kpiStaticData, kpiInitialFallback, type KpiV2 } from "@/lib/mock-data";

function rmFmt(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return "RM " + n.toLocaleString("en-MY", { maximumFractionDigits: 0 });
}

export function KpiStrip() {
  const [escrowLocked, setEscrowLocked] = useState<KpiV2>(kpiInitialFallback.escrowLocked);
  const [liquidity, setLiquidity] = useState<KpiV2>(kpiInitialFallback.liquidity);

  const refresh = useCallback(async () => {
    try {
      const k = await getDashboardKpis();
      setEscrowLocked({
        ...kpiInitialFallback.escrowLocked,
        value: rmFmt(k.escrow_locked_rm),
        delta: "+ live ledger",
      });
      setLiquidity({
        ...kpiInitialFallback.liquidity,
        value: rmFmt(k.liquidity_available_rm),
        delta: "wholesaler wallet",
      });
    } catch (err) {
      console.warn("KPI fetch failed", err);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useDemoBus(
    useCallback(
      (event) => {
        if (
          event.type === "merchant:escrow-locked" ||
          event.type === "wholesaler:liquidity-received" ||
          event.type === "merchant:offer-accepted" ||
          event.type === "system:reset"
        ) {
          void refresh();
        }
      },
      [refresh]
    )
  );

  return (
    <div className="grid grid-cols-4 gap-px bg-stroke-soft">
      <KpiCard {...escrowLocked} index={0} />
      <KpiCard {...liquidity} index={1} />
      <KpiCard {...kpiStaticData.activeMsmes} index={2} />
      <KpiCard {...kpiStaticData.goPlusYield} index={3} />
    </div>
  );
}
