"use client";

import { motion } from "motion/react";
import { Plus, QrCode, ScanLine, Send, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { TngButton } from "./tng-button";
import { merchant, fmtRm } from "@/lib/mobile-mock-data";
import type { MsmeDemandPressureSummary, MsmeInsightResponse } from "@/lib/api";

type Props = {
  onFundOrder: () => void;
  summary: MsmeDemandPressureSummary | null;
  insight: MsmeInsightResponse | null;
  loading: boolean;
  error: string | null;
};

const quickActions = [
  { label: "Scan", icon: ScanLine, primary: true },
  { label: "Pay", icon: Send, primary: false },
  { label: "Reload", icon: Plus, primary: false },
  { label: "Receive", icon: QrCode, primary: false },
] as const;

export function ScreenMerchantAlert({
  onFundOrder,
  summary,
  insight,
  loading,
  error,
}: Props) {
  const reasonCodes = summary?.reason_codes.slice(0, 2) ?? [];

  return (
    <>
      <TngAppHeader title="Home" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <div className="text-white">
          <p className="text-[11px] uppercase tracking-[0.1em] opacity-75">Good evening</p>
          <p className="text-xl font-semibold">{merchant.shortName}</p>
        </div>

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
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Wallet balance
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">
              {fmtRm(summary?.calculation_trace.current_balance_rm ?? merchant.walletBalanceRm)}
            </p>
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
            {loading ? (
              <div className="mt-3 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-paper-grid" />
                <div className="h-4 w-full animate-pulse rounded bg-paper-grid" />
              </div>
            ) : error ? (
              <p className="mt-3 text-[13px] leading-snug text-tng-red">{error}</p>
            ) : summary ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-tng-yellow" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tng-blue-deep">
                        Demand model
                      </span>
                    </div>
                    <p className="mt-2 font-display text-2xl font-bold leading-none text-ink">
                      {summary.result.demand_pressure_label}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                      demand pressure predicted
                    </p>
                  </div>
                  <div className="rounded-2xl bg-tng-blue-app px-3 py-2 text-right text-white">
                    <p className="font-display text-2xl font-bold leading-none">
                      {summary.result.demand_pressure_score.toFixed(1)}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] opacity-80">
                      score
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric
                    label="Confidence"
                    value={`${summary.result.confidence_score.toFixed(1)}%`}
                  />
                  <Metric
                    label="3-day inflow"
                    value={fmtRm(summary.calculation_trace.projected_3_day_inflow_rm, 2)}
                    icon={<TrendingUp className="size-3.5" />}
                  />
                </div>
              </>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stroke-soft pt-3 text-[12px]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Suggested top-up
                </p>
                <p className="mt-0.5 font-display text-lg font-bold text-ink">
                  {fmtRm(summary?.calculation_trace.suggested_bnpl_topup_rm ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Estimated cash gap
                </p>
                <p className="mt-0.5 font-display text-lg font-bold text-tng-red">
                  -{fmtRm(summary?.calculation_trace.estimated_cash_gap_rm ?? 0, 2)}
                </p>
              </div>
            </div>

            {insight && !loading && !error ? (
              <div className="mt-3 rounded-2xl bg-paper-grid p-3">
                <p className="text-[12px] font-semibold leading-snug text-ink">
                  {insight.headline}
                </p>
                {insight.summary ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    {insight.summary}
                  </p>
                ) : null}

                {insight.main_numbers.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {insight.main_numbers.slice(0, 4).map((number) => (
                      <div key={number.label} className="rounded-xl bg-white px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {number.label}
                        </p>
                        <p className="mt-0.5 font-display text-sm font-bold text-ink">
                          {number.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {insight.plain_reasons.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {insight.plain_reasons.slice(0, 3).map((reason) => (
                      <p key={reason} className="text-[11px] leading-relaxed text-ink">
                        - {reason}
                      </p>
                    ))}
                  </div>
                ) : null}

                {insight.repayment_text ? (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-tng-blue-deep">
                    {insight.repayment_text}
                  </p>
                ) : null}

                {insight.caveat ? (
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                    {insight.caveat}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!insight && reasonCodes.length > 0 ? (
              <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                {reasonCodes.map((reason) => (
                  <p key={reason.code}>- {reason.message}</p>
                ))}
              </div>
            ) : null}

            <TngButton onClick={onFundOrder} className="mt-4" disabled={loading || !!error}>
              Fund &amp; Order
            </TngButton>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Model suggestion only - review before accepting financing
            </p>
          </TngCard>
        </motion.div>
      </div>
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper-grid px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-base font-bold text-ink">{value}</p>
    </div>
  );
}
