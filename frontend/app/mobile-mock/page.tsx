"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { ScreenMerchantAlert } from "@/components/mobile/screen-merchant-alert";
import { ScreenMerchantScan } from "@/components/mobile/screen-merchant-scan";
import { ScreenMerchantContract } from "@/components/mobile/screen-merchant-contract";
import { ScreenMerchantOffer } from "@/components/mobile/screen-merchant-offer";
import { publish, useDemoBus } from "@/lib/demo-bus";
import { escrowDraft } from "@/lib/mobile-mock-data";
import {
  ApiError,
  getDemandPressureInsight,
  getMockDemandPressure,
  type InvoiceDraft,
  type MsmeDemandPressureSummary,
} from "@/lib/api";

type Scene = "alert" | "scan" | "contract" | "offer";
const ACTIVE_INVOICE_KEY = "think-n-go-active-invoice";

function parseNetDays(value: string | undefined) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : escrowDraft.termDays;
}

function buildEscrowDraft(summary: MsmeDemandPressureSummary | null, invoice: InvoiceDraft | null) {
  const totalRm =
    invoice?.total || summary?.calculation_trace.typical_large_outflow_rm || escrowDraft.totalRm;
  const supplierName = invoice?.supplier.name || escrowDraft.wholesalerName;
  const bnplRm = summary?.calculation_trace.suggested_bnpl_topup_rm || escrowDraft.bnplRm;
  const ownFundsRm = Math.max(0, totalRm - bnplRm);

  return {
    ...escrowDraft,
    invoiceNum: invoice?.invoice_num ?? escrowDraft.invoiceNum,
    invoiceRef: invoice?.invoice_ref ?? escrowDraft.invoiceRef,
    wholesalerName: supplierName,
    totalRm,
    bnplRm,
    ownFundsRm,
    termDays: parseNetDays(invoice?.terms.net_days),
    repaymentSweepPct: 5,
    dispatchEta: invoice?.terms.delivery_terms || escrowDraft.dispatchEta,
    description: invoice?.description || invoice?.notes || escrowDraft.description,
    receiverName: invoice?.receiver.name || escrowDraft.receiverName,
  };
}

export default function MobileMockPage() {
  const [scene, setScene] = useState<Scene>("alert");
  const [offerSettled, setOfferSettled] = useState(false);
  const [incomingDiscountPct, setIncomingDiscountPct] = useState(2.0);
  const [summary, setSummary] = useState<MsmeDemandPressureSummary | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceDraft | null>(null);
  const [insightMessage, setInsightMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      setLoading(true);
      setError(null);

      try {
        const nextSummary = await getMockDemandPressure({ current_balance_rm: 760 });
        if (cancelled) return;
        setSummary(nextSummary);

        try {
          const insight = await getDemandPressureInsight(nextSummary);
          if (!cancelled) {
            setInsightMessage(insight.message);
          }
        } catch (insightError) {
          if (!cancelled) {
            setInsightMessage(null);
          }
          console.warn("MSME insight generation failed", insightError);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof ApiError
              ? loadError.message
              : "Unable to load the demand pressure summary right now.";
          setError(message);
          setSummary(null);
          setInsightMessage(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ACTIVE_INVOICE_KEY);
    if (!stored) return;
    try {
      setActiveInvoice(JSON.parse(stored) as InvoiceDraft);
    } catch {
      window.localStorage.removeItem(ACTIVE_INVOICE_KEY);
    }
  }, []);

  const liveDraft = useMemo(() => buildEscrowDraft(summary, activeInvoice), [summary, activeInvoice]);
  const repaymentDays = summary?.calculation_trace.estimated_repayment_days ?? 0;
  const expectedDailyRepaymentRm =
    summary?.calculation_trace.expected_5pct_daily_repayment_rm ?? 0;

  useDemoBus(
    useCallback((event) => {
      if (event.type === "invoice:draft-updated") {
        setActiveInvoice(event.payload);
        return;
      }
      if (event.type === "wholesaler:offer-sent") {
        setIncomingDiscountPct(event.payload.discountPct);
        setOfferSettled(false);
        setScene("offer");
      }
    }, [])
  );

  function fundOrder() {
    publish({
      type: "merchant:bnpl-funded",
      payload: { escrowId: liveDraft.escrowId, amount: liveDraft.totalRm, bnpl: liveDraft.bnplRm },
    });
    setScene("scan");
  }

  function lockEscrow() {
    publish({
      type: "merchant:escrow-locked",
      payload: {
        escrowId: liveDraft.escrowId,
        amount: liveDraft.totalRm,
        termDays: liveDraft.termDays,
        merchantName: "Ahmad bin Yusof",
        business: liveDraft.receiverName || "Merchant profile unavailable",
      },
    });
    setScene("alert");
  }

  function acceptOffer() {
    const discountRm = Math.round((liveDraft.totalRm * incomingDiscountPct) / 100);
    publish({
      type: "merchant:offer-accepted",
      payload: {
        escrowId: liveDraft.escrowId,
        discountPct: incomingDiscountPct,
        payout: liveDraft.totalRm - discountRm,
      },
    });
    setOfferSettled(true);
  }

  function declineOffer() {
    setOfferSettled(false);
    setScene("alert");
  }

  return (
    <PhoneShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="flex flex-1 flex-col"
        >
          {scene === "alert" && (
            <ScreenMerchantAlert
              onFundOrder={fundOrder}
              summary={summary}
              insightMessage={insightMessage}
              loading={loading}
              error={error}
            />
          )}
          {scene === "scan" && (
            <ScreenMerchantScan
              draft={liveDraft}
              onScanComplete={() => setScene("contract")}
              onBack={() => setScene("alert")}
            />
          )}
          {scene === "contract" && (
            <ScreenMerchantContract
              draft={liveDraft}
              repaymentDays={repaymentDays}
              expectedDailyRepaymentRm={expectedDailyRepaymentRm}
              onLock={lockEscrow}
              onBack={() => setScene("scan")}
            />
          )}
          {scene === "offer" && (
            <ScreenMerchantOffer
              draft={liveDraft}
              discountPct={incomingDiscountPct}
              onAccept={acceptOffer}
              onDecline={declineOffer}
              settled={offerSettled}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          setScene("alert");
          setOfferSettled(false);
        }}
        className="absolute right-3 top-9 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] text-white/80 hover:bg-black/50"
      >
        reset
      </button>
    </PhoneShell>
  );
}
