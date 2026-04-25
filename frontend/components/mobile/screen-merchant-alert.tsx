"use client";

import { motion } from "motion/react";
import { Plus, QrCode, ScanLine, Send, Sparkles, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { merchant, stockoutAlert, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onFundOrder: () => void;
};

const quickActions = [
  { label: "Scan", icon: ScanLine, primary: true },
  { label: "Pay", icon: Send, primary: false },
  { label: "Reload", icon: Plus, primary: false },
  { label: "Receive", icon: QrCode, primary: false },
] as const;

export function ScreenMerchantAlert({ onFundOrder }: Props) {
  return (
    <>
      <TngAppHeader title="Home" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <div className="text-white">
          <p className="text-[11px] uppercase tracking-[0.1em] opacity-75">Good evening</p>
          <p className="text-xl font-semibold">{merchant.shortName}</p>
        </div>

        {/* TNG signature: quick-action row */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(({ label, icon: Icon, primary }) => (
            <button
              key={label}
              type="button"
              onClick={primary ? onFundOrder : undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-tng-blue-app shadow-sm transition-transform hover:scale-105">
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-medium text-white">{label}</span>
            </button>
          ))}
        </div>

        <TngCard className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Wallet balance</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{fmtRm(merchant.walletBalanceRm)}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-tng-yellow text-ink">
            <Wallet className="size-6" />
          </div>
        </TngCard>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <TngCard className="border-l-4 border-tng-yellow">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-tng-yellow" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tng-blue-deep">
                AI Alert · Predictive Restock
              </span>
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-ink">
              {stockoutAlert.recommendedQty}× bulk order of {stockoutAlert.product}
            </p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Stock out in {stockoutAlert.forecastDays} days · {stockoutAlert.trendingDelta}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stroke-soft pt-3 text-[12px]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Order total</p>
                <p className="mt-0.5 font-display text-lg font-bold text-ink">{fmtRm(stockoutAlert.totalRm)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Cash short</p>
                <p className="mt-0.5 font-display text-lg font-bold text-tng-red">−{fmtRm(stockoutAlert.shortfallRm)}</p>
              </div>
            </div>

            <TngButton onClick={onFundOrder} className="mt-4">
              Fund &amp; Order
            </TngButton>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              RM 500 BNPL approved · 0% if repaid via QR sweep
            </p>
          </TngCard>
        </motion.div>
      </div>
    </>
  );
}
