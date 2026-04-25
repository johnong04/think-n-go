"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { liquidityProjection, merchantCashFlow } from "@/lib/mock-data";
import type { Mode } from "@/lib/mock-data";

type CoordReadout = { day: number; value: number } | null;

type Props = {
  mode: Mode;
};

export function LiquidityChart({ mode }: Props) {
  const [coord, setCoord] = useState<CoordReadout>(null);
  const data = mode === "merchant" ? merchantCashFlow : liquidityProjection;
  const title = mode === "merchant" ? "Cash Flow" : "Liquidity Projection";
  const subtitle = mode === "merchant" ? "30-Day QR Velocity vs BNPL Sweep" : "30-Day Forward Curve";

  return (
    <section className="border border-stroke-soft border-t-2 border-t-tng-blue bg-card p-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            SYS.COORD
          </div>
          <div className="font-mono text-[11px] text-ink">
            {coord
              ? `${coord.day.toString().padStart(2, "0")}.000 / ${(coord.value / 1000).toFixed(3)}`
              : "—.— / —.—"}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-tng-blue" />
              {mode === "merchant" ? "QR Sales" : "Base Trend"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-down" />
              {mode === "merchant" ? "BNPL Sweep" : "Shortfall Risk"}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
            onMouseMove={(state: Record<string, unknown>) => {
              const payload = (state?.activePayload as Array<{ payload: { day: number; baseTrend: number } }> | undefined)?.[0]?.payload;
              if (payload) {
                setCoord({ day: payload.day, value: payload.baseTrend });
              }
            }}
            onMouseLeave={() => setCoord(null)}
          >
            <defs>
              <linearGradient id="baseTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--tng-blue)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--tng-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--paper-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--muted-text)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--stroke-soft)" }}
            />
            <YAxis
              tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--muted-text)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip cursor={{ stroke: "var(--ink)", strokeWidth: 1 }} content={() => null} />
            <Area
              type="monotone"
              dataKey="baseTrend"
              stroke="var(--tng-blue)"
              strokeWidth={2}
              fill="url(#baseTrendFill)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="var(--down)"
              strokeWidth={2}
              fill="var(--tng-yellow-tint)"
              fillOpacity={0.6}
              animationDuration={800}
              animationBegin={400}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
