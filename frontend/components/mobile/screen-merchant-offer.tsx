"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { fmtRm, type EscrowDraft } from "@/lib/mobile-mock-data";

type Props = {
  draft: EscrowDraft;
  discountPct: number;
  onAccept: () => void;
  onDecline: () => void;
  settled: boolean;
  /** Bedrock-generated arbitrage reasoning, char-streamed in. */
  arbitrageText?: string;
};

export function ScreenMerchantOffer({
  draft,
  discountPct,
  onAccept,
  onDecline,
  settled,
  arbitrageText,
}: Props) {
  const discountAmount = Math.round((draft.totalRm * discountPct) / 100);
  const payout = draft.totalRm - discountAmount;

  return (
    <div className="flex flex-1 flex-col items-center justify-end px-5 pb-10">
      <div className="absolute inset-x-5 top-24 text-center text-white">
        <p className="font-display text-[60px] font-bold leading-none tracking-tight">23:34</p>
        <p className="mt-2 text-sm opacity-80">Friday, 25 April</p>
      </div>

      {settled ? (
        <motion.div
          key="settled"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <TngCard className="flex items-start gap-3 border-2 border-up">
            <CheckCircle2 className="size-6 shrink-0 text-up" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-up">
                Escrow released
              </p>
              <p className="mt-1 text-[14px] text-ink">
                {fmtRm(payout, 2)} settled to {draft.wholesalerName}.{" "}
                {fmtRm(discountAmount, 2)} returned to your wallet.
              </p>
            </div>
          </TngCard>
        </motion.div>
      ) : (
        <motion.div
          key="offer"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full"
        >
          <div className="overflow-hidden rounded-[24px] bg-white/15 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
              <span className="size-2 rounded-full bg-tng-yellow" />
              TNG Wallet - Now
            </div>
            <div className="bg-white p-5 text-ink">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tng-blue-deep">
                Wholesaler offer - Early release
              </p>
              <p className="mt-2 text-[15px] leading-snug text-ink">
                <strong>{draft.wholesalerName}</strong> offers a{" "}
                <strong className="text-tng-blue-app">{discountPct.toFixed(1)}%</strong>{" "}
                discount to release escrow <strong>{draft.escrowId}</strong> today instead of
                waiting Net-{draft.termDays}.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
                <Stat label="Original" value={fmtRm(draft.totalRm, 2)} />
                <Stat label="Discount" value={`-${fmtRm(discountAmount, 2)}`} accent />
                <Stat label="Wholesaler nets" value={fmtRm(payout, 2)} />
              </div>

              {arbitrageText ? (
                <div className="mt-3 rounded-xl bg-tng-blue-app/5 p-3">
                  <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-tng-blue-app">
                    Yield arbitrage
                  </p>
                  <p className="font-editorial text-[11px] italic leading-snug text-ink">
                    {arbitrageText}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <TngButton variant="secondary" onClick={onDecline}>
                  Decline
                </TngButton>
                <TngButton variant="yellow" onClick={onAccept}>
                  Accept - You earn {fmtRm(discountAmount, 2)}
                </TngButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-base font-bold ${accent ? "text-tng-yellow" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
