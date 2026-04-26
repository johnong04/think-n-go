"use client";

import { motion } from "motion/react";
import { ArrowDownToLine, Clock, Coins, FileText, Lock, ReceiptText } from "lucide-react";
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
  /** Bedrock-generated underwriting reasoning, char-streamed in. */
  underwritingText?: string;
};

export function ScreenMerchantContract({
  draft,
  repaymentDays,
  expectedDailyRepaymentRm,
  onLock,
  onBack,
  underwritingText,
}: Props) {
  const totalYield = draft.dailyYieldRm * draft.termDays;
  const ownPct = draft.totalRm > 0 ? (draft.ownFundsRm / draft.totalRm) * 100 : 0;
  const items = draft.invoiceItems ?? [];
  const shownItems = items.slice(0, 3);
  const remainingItemCount = Math.max(0, items.length - shownItems.length);

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Attached invoice
              </p>
              <p className="mt-1 font-display text-xl font-bold text-ink">
                {draft.invoiceNum || "Invoice draft"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {draft.issueDate || "Issue date pending"} - {draft.dueDate || `Net-${draft.termDays}`}
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-tng-blue-app/10 text-tng-blue-app">
              <FileText className="size-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-stroke-soft bg-paper-grid p-3">
            <div className="flex items-start justify-between gap-3 border-b border-stroke-soft pb-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">From</p>
                <p className="text-[12px] font-semibold text-ink">{draft.wholesalerName}</p>
                {draft.supplierLocation ? (
                  <p className="text-[10px] text-muted-foreground">{draft.supplierLocation}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">To</p>
                <p className="text-[12px] font-semibold text-ink">
                  {draft.receiverName || "Merchant"}
                </p>
                {draft.receiverLocation ? (
                  <p className="text-[10px] text-muted-foreground">{draft.receiverLocation}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {shownItems.length > 0 ? (
                shownItems.map((item, index) => (
                  <InvoiceItemRow key={`${item.productName}-${index}`} item={item} />
                ))
              ) : (
                <p className="py-2 text-[11px] text-muted-foreground">
                  No line items attached yet. Sync an invoice draft from the invoice page.
                </p>
              )}
              {remainingItemCount > 0 ? (
                <p className="text-[10px] font-medium text-muted-foreground">
                  +{remainingItemCount} more item{remainingItemCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-stroke-soft pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Invoice total
              </span>
              <span className="font-display text-lg font-bold text-ink">{fmtRm(draft.totalRm, 2)}</span>
            </div>
          </div>
        </TngCard>

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
            <Row icon={<ReceiptText className="size-4" />} label="Invoice note" value={draft.description} />
          ) : null}
          {draft.notes ? (
            <Row icon={<ReceiptText className="size-4" />} label="Supplier note" value={draft.notes} />
          ) : null}
        </TngCard>

        {underwritingText ? (
          <div className="rounded-2xl border border-tng-yellow/40 bg-tng-yellow/10 p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-tng-blue-app">
              AI Underwriting
            </p>
            <p className="font-editorial text-[12px] italic leading-snug text-ink">
              {underwritingText}
            </p>
          </div>
        ) : null}

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

function InvoiceItemRow({
  item,
}: {
  item: { productName: string; quantity: number; unitPrice: number };
}) {
  const lineTotal = item.quantity * item.unitPrice;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 text-[11px]">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{item.productName}</p>
        <p className="text-muted-foreground">
          {item.quantity} x {fmtRm(item.unitPrice, 2)}
        </p>
      </div>
      <p className="font-semibold tabular-nums text-ink">{fmtRm(lineTotal, 2)}</p>
    </div>
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
