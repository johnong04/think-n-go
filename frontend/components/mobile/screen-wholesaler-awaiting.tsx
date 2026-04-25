"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  client: ClientRow;
  discountPct: number;
  settled: boolean;
  onReset: () => void;
};

export function ScreenWholesalerAwaiting({ client, discountPct, settled, onReset }: Props) {
  const payout = Math.round(client.escrowRm * (1 - discountPct / 100));

  return (
    <>
      <TngAppHeader title={settled ? "Settled" : "Sending offer"} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-12 text-center">
        {settled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="grid size-20 place-items-center rounded-full bg-up/15">
              <CheckCircle2 className="size-12 text-up" />
            </div>
            <TngCard className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-up">Settled</p>
              <p className="mt-2 text-[14px] text-ink">
                <strong>{client.name.split(" ")[0]}</strong> accepted the {discountPct.toFixed(1)}% offer.
              </p>
              <p className="mt-3 font-display text-3xl font-bold text-ink">{fmtRm(payout)}</p>
              <p className="text-[12px] text-muted-foreground">credited to your wallet</p>
            </TngCard>
            <TngButton variant="secondary" onClick={onReset}>
              Back to clients
            </TngButton>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="relative grid size-20 place-items-center">
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-tng-yellow"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="size-3 rounded-full bg-tng-yellow" />
            </div>
            <p className="text-[15px] font-semibold">
              Offer sent to {client.name.split(" ")[0]}
            </p>
            <p className="max-w-[260px] text-[12px] opacity-80">
              Awaiting acceptance · The merchant&apos;s AI is evaluating your {discountPct.toFixed(1)}% offer now.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
