"use client";

import { Slider } from "@/components/ui/slider";
import { yieldOffer, formatRm } from "@/lib/mock-data";

type Props = {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
};

export function YieldSlider({ value, onChange, disabled = false }: Props) {
  const delta = (value - yieldOffer.base) / 100;
  const deltaAmount = Math.round(yieldOffer.baseAmount * delta);

  return (
    <section className="flex flex-col gap-3 border border-stroke-soft bg-card p-4">
      <header className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          yield arbitrage
        </span>
        <span className="font-display text-2xl font-bold tabular-nums text-ink">
          {value.toFixed(1)}%
        </span>
      </header>

      <Slider
        value={[value] as readonly number[]}
        onValueChange={(v) => {
          const arr = v as readonly number[];
          onChange(arr[0]);
        }}
        min={yieldOffer.base}
        max={yieldOffer.max}
        step={yieldOffer.step}
        disabled={disabled}
        className="[&_[data-slot=slider-track]]:bg-stroke-soft [&_[data-slot=slider-range]]:bg-tng-yellow [&_[data-slot=slider-thumb]]:border-tng-yellow [&_[data-slot=slider-thumb]]:bg-ink [&_[data-slot=slider-thumb]]:ring-tng-yellow/30"
      />

      <footer className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">offer delta</span>
        <span className="text-tng-blue-deep tabular-nums">
          +{formatRm(deltaAmount)} on RM {yieldOffer.baseAmount.toLocaleString("en-MY")}
        </span>
      </footer>
    </section>
  );
}
