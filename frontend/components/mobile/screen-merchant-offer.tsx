"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  discountPct: number;
  onAccept: () => void;
  onDecline: () => void;
  settled: boolean;
};

export function ScreenMerchantOffer({ discountPct, onAccept, onDecline, settled }: Props) {
  const discountAmount = Math.round((escrowDraft.totalRm * discountPct) / 100);
  const payout = escrowDraft.totalRm - discountAmount;

  return (
    <div className="flex flex-1 flex-col items-center justify-end px-5 pb-10">
      {/* Lock-screen wallpaper hint behind the notification */}
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-up">Escrow released</p>
              <p className="mt-1 text-[14px] text-ink">
                {fmtRm(payout)} settled to {escrowDraft.wholesalerName}. {fmtRm(discountAmount)} returned to your wallet.
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
              TNG Wallet · Now
            </div>
            <div className="bg-white p-5 text-ink">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tng-blue-deep">
                Wholesaler offer · Early release
              </p>
              <p className="mt-2 text-[15px] leading-snug text-ink">
                <strong>{escrowDraft.wholesalerName}</strong> offers a{" "}
                <strong className="text-tng-blue-app">{discountPct.toFixed(1)}%</strong> discount to release escrow{" "}
                <strong>{escrowDraft.escrowId}</strong> today instead of waiting Net-{escrowDraft.termDays}.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stroke-soft pt-3 text-[12px]">
                <Stat label="Original" value={fmtRm(escrowDraft.totalRm)} />
                <Stat label="Discount" value={`−${fmtRm(discountAmount)}`} accent />
                <Stat label="Wholesaler nets" value={fmtRm(payout)} />
              </div>

              <div className="mt-4 flex gap-2">
                <TngButton variant="secondary" onClick={onDecline}>
                  Decline
                </TngButton>
                <TngButton variant="yellow" onClick={onAccept}>
                  Accept · You earn {fmtRm(discountAmount)}
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
      <p className={`mt-1 font-display text-base font-bold ${accent ? "text-tng-yellow" : "text-ink"}`}>{value}</p>
    </div>
  );
}
