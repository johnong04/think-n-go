"use client";

import { Slider } from "@/components/ui/slider";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { offerPayload, fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  client: ClientRow;
  discountPct: number;
  onDiscountChange: (pct: number) => void;
  onSend: () => void;
  onBack: () => void;
};

export function ScreenWholesalerLiquidate({ client, discountPct, onDiscountChange, onSend, onBack }: Props) {
  const discountRm = Math.round((client.escrowRm * discountPct) / 100);
  const payout = client.escrowRm - discountRm;
  const daysSaved = client.termDays - client.daysIn;

  return (
    <>
      <TngAppHeader title="Send Offer" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <TngCard>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Counterparty</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{client.name}</p>
          <p className="text-[12px] text-muted-foreground">{client.business}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
            <div>
              <p className="text-muted-foreground">Escrow value</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(client.escrowRm)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Days remaining</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{daysSaved}</p>
            </div>
          </div>
        </TngCard>

        <TngCard>
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Discount offered
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-tng-blue-app">
              {discountPct.toFixed(1)}%
            </p>
          </div>

          <Slider
            value={[discountPct]}
            onValueChange={(v) => onDiscountChange(Array.isArray(v) ? v[0] : (v as number))}
            min={offerPayload.minDiscountPct}
            max={offerPayload.maxDiscountPct}
            step={offerPayload.stepDiscountPct}
            className="mt-4 [&_[data-slot=slider-track]]:bg-stroke-soft [&_[data-slot=slider-range]]:bg-tng-blue-app [&_[data-slot=slider-thumb]]:border-tng-blue-app [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:ring-tng-blue-app/30"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
            <div>
              <p className="text-muted-foreground">You receive today</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(payout)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">vs. waiting {daysSaved}d</p>
              <p className="mt-1 font-display text-lg font-bold text-tng-red">−{fmtRm(discountRm)}</p>
            </div>
          </div>
        </TngCard>

        <TngButton onClick={onSend}>
          Send offer to {client.name.split(" ")[0]}
        </TngButton>
      </div>
    </>
  );
}
