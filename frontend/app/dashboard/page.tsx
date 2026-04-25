"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { LiquidityChart } from "@/components/dashboard/liquidity-chart";
import { EscrowTable } from "@/components/dashboard/escrow-table";

export default function DashboardPage() {
  return (
    <DashboardShell
      staticContent={(mode) => (
        <div className="flex flex-col gap-px bg-stroke-soft">
          <KpiStrip mode={mode} />
          <div className="flex flex-col gap-px bg-stroke-soft">
            <LiquidityChart mode={mode} />
            <EscrowTable mode={mode} />
          </div>
        </div>
      )}
    />
  );
}
