"use client";

import { motion } from "motion/react";
import { Lock, Coins, Clock, ArrowDownToLine } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onLock: () => void;
  onBack: () => void;
};

export function ScreenMerchantContract({ onLock, onBack }: Props) {
  const totalYield = escrowDraft.dailyYieldRm * escrowDraft.termDays;
  const ownPct = (escrowDraft.ownFundsRm / escrowDraft.totalRm) * 100;

  return (
    <>
      <TngAppHeader title="Smart Contract" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TngCard className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                Escrow ID · {escrowDraft.escrowId}
              </span>
              <span className="rounded-full bg-tng-blue-app/10 px-2 py-1 text-[10px] font-semibold text-tng-blue-app">
                Pending lock
              </span>
            </div>
            <p className="font-display text-3xl font-bold text-ink">{fmtRm(escrowDraft.totalRm)}</p>
            <p className="text-[12px] text-muted-foreground">
              to <strong className="text-ink">{escrowDraft.wholesalerName}</strong> · Net-{escrowDraft.termDays}
            </p>
          </TngCard>
        </motion.div>

        <TngCard className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Funding split
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-stroke-soft">
            <motion.div
              className="bg-tng-blue-app"
              initial={{ width: 0 }}
              animate={{ width: `${ownPct}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.div
              className="bg-tng-yellow"
              initial={{ width: 0 }}
              animate={{ width: `${100 - ownPct}%` }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-blue-app" />
              <div>
                <p className="text-muted-foreground">Own funds</p>
                <p className="font-display text-lg font-bold text-ink">{fmtRm(escrowDraft.ownFundsRm)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-yellow" />
              <div>
                <p className="text-muted-foreground">BNPL line</p>
                <p className="font-display text-lg font-bold text-ink">{fmtRm(escrowDraft.bnplRm)}</p>
              </div>
            </div>
          </div>
        </TngCard>

        <TngCard className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Terms
          </p>
          <Row icon={<Clock className="size-4" />}              label="Lock duration"      value={`${escrowDraft.termDays} days`} />
          <Row icon={<Coins className="size-4" />}              label="Daily yield"        value={`+${fmtRm(escrowDraft.dailyYieldRm, 2)} (TNG GO+)`} />
          <Row icon={<Coins className="size-4" />}              label={`Projected yield (${escrowDraft.termDays}d)`}    value={`+${fmtRm(totalYield, 2)}`} />
          <Row icon={<ArrowDownToLine className="size-4" />}    label="BNPL repayment"     value={`${escrowDraft.repaymentSweepPct}% sweep on incoming QR`} />
          <Row icon={<Lock className="size-4" />}               label="Settlement"         value={escrowDraft.dispatchEta} />
        </TngCard>

        <div className="mt-2 flex flex-col gap-2">
          <TngButton onClick={onLock}>
            <Lock className="mr-2 size-4" />
            Lock Escrow {fmtRm(escrowDraft.totalRm)}
          </TngButton>
          <TngButton variant="secondary" onClick={onBack}>
            Edit
          </TngButton>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stroke-soft pt-3 first:border-0 first:pt-0">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="text-tng-blue-app">{icon}</span>
        {label}
      </div>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}
