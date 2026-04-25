"use client";

import { motion } from "motion/react";
import { ArrowDownToLine, Clock, Coins, Lock } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { fmtRm, type EscrowDraft } from "@/lib/mobile-mock-data";

type Props = {
  draft: EscrowDraft;
  repaymentDays: number;
  expectedDailyRepaymentRm: number;
  onLock: () => void;
  onBack: () => void;
};

export function ScreenMerchantContract({
  draft,
  repaymentDays,
  expectedDailyRepaymentRm,
  onLock,
  onBack,
}: Props) {
  const totalYield = draft.dailyYieldRm * draft.termDays;
  const ownPct = draft.totalRm > 0 ? (draft.ownFundsRm / draft.totalRm) * 100 : 0;

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
                Escrow ID - {draft.escrowId}
              </span>
              <span className="rounded-full bg-tng-blue-app/10 px-2 py-1 text-[10px] font-semibold text-tng-blue-app">
                Pending lock
              </span>
            </div>
            <p className="font-display text-3xl font-bold text-ink">{fmtRm(draft.totalRm, 2)}</p>
            <p className="text-[12px] text-muted-foreground">
              to <strong className="text-ink">{draft.wholesalerName}</strong> - Net-{draft.termDays}
            </p>
            {draft.invoiceNum ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Invoice {draft.invoiceNum}
                {draft.invoiceRef ? ` / ${draft.invoiceRef}` : ""}
              </p>
            ) : null}
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
              animate={{ width: `${Math.max(0, Math.min(100, ownPct))}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.div
              className="bg-tng-yellow"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, 100 - ownPct)}%` }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-blue-app" />
              <div>
                <p className="text-muted-foreground">Own funds</p>
                <p className="font-display text-lg font-bold text-ink">
                  {fmtRm(draft.ownFundsRm, 2)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 rounded-full bg-tng-yellow" />
              <div>
                <p className="text-muted-foreground">BNPL line</p>
                <p className="font-display text-lg font-bold text-ink">
                  {fmtRm(draft.bnplRm, 2)}
                </p>
              </div>
            </div>
          </div>
        </TngCard>

        <TngCard className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Terms
          </p>
          <Row icon={<Clock className="size-4" />} label="Lock duration" value={`${draft.termDays} days`} />
          <Row
            icon={<Coins className="size-4" />}
            label="Daily yield"
            value={`+${fmtRm(draft.dailyYieldRm, 2)} (TNG GO+)`}
          />
          <Row
            icon={<Coins className="size-4" />}
            label={`Projected yield (${draft.termDays}d)`}
            value={`+${fmtRm(totalYield, 2)}`}
          />
          <Row
            icon={<ArrowDownToLine className="size-4" />}
            label="BNPL repayment"
            value={`${draft.repaymentSweepPct}% sweep - ${fmtRm(expectedDailyRepaymentRm, 2)}/day - ~${repaymentDays}d`}
          />
          <Row icon={<Lock className="size-4" />} label="Settlement" value={draft.dispatchEta} />
          {draft.description ? (
            <Row icon={<Lock className="size-4" />} label="Invoice note" value={draft.description} />
          ) : null}
        </TngCard>

        <div className="mt-2 flex flex-col gap-2">
          <TngButton onClick={onLock}>
            <Lock className="mr-2 size-4" />
            Lock Escrow {fmtRm(draft.totalRm, 2)}
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
