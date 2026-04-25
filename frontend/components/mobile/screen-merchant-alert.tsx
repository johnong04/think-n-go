"use client";

import { motion } from "motion/react";
import { Sparkles, TrendingUp, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { merchant, stockoutAlert, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onFundOrder: () => void;
};

export function ScreenMerchantAlert({ onFundOrder }: Props) {
  return (
    <>
      <TngAppHeader title="Home" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <div className="text-white">
          <p className="text-[12px] uppercase tracking-[0.1em] opacity-75">Good evening</p>
          <p className="text-xl font-semibold">{merchant.shortName}</p>
        </div>

        <TngCard className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Wallet balance</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{fmtRm(merchant.walletBalanceRm)}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-tng-blue-app/10 text-tng-blue-app">
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tng-blue-deep">
                AI Alert · Predictive Restock
              </span>
            </div>
            <p className="mt-3 text-base font-semibold leading-snug text-ink">
              High demand projected. Recommend {stockoutAlert.recommendedQty}× bulk order of {stockoutAlert.product}.
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Stock will run out in {stockoutAlert.forecastDays} days at current QR velocity ({stockoutAlert.trendingDelta}).
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stroke-soft pt-3 text-[12px]">
              <div>
                <p className="text-muted-foreground">Order total</p>
                <p className="mt-1 font-display text-lg font-bold text-ink">{fmtRm(stockoutAlert.totalRm)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cash shortfall</p>
                <p className="mt-1 font-display text-lg font-bold text-tng-red">{fmtRm(stockoutAlert.shortfallRm)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-tng-blue-app/5 p-3 text-[12px] text-tng-blue-deep">
              <TrendingUp className="size-4 shrink-0" />
              <span>Approved for RM 500 fractional BNPL line · 0% if repaid via QR sweep</span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <TngButton onClick={onFundOrder}>Fund &amp; Order</TngButton>
              <TngButton variant="secondary">Dismiss</TngButton>
            </div>
          </TngCard>
        </motion.div>
      </div>
    </>
  );
}
