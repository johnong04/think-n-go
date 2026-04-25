import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { LiquidityChart } from "@/components/dashboard/liquidity-chart";
import { EscrowTable } from "@/components/dashboard/escrow-table";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <KpiStrip />
      <LiquidityChart />
      <EscrowTable />
    </DashboardShell>
  );
}
