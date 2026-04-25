import { kpis } from "@/lib/mock-data";
import { KpiCard } from "./kpi-card";

export function KpiStrip() {
  return (
    <div className="grid grid-cols-4 gap-px bg-stroke-soft">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.caption} {...kpi} index={i} />
      ))}
    </div>
  );
}
