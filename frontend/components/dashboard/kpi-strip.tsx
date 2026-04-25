import { kpisForMode } from "@/lib/mock-data";
import type { Mode } from "@/lib/mock-data";
import { KpiCard } from "./kpi-card";

type Props = {
  mode: Mode;
};

export function KpiStrip({ mode }: Props) {
  const kpis = kpisForMode(mode);
  return (
    <div className="grid grid-cols-4 gap-px bg-stroke-soft">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.caption} {...kpi} index={i} />
      ))}
    </div>
  );
}
