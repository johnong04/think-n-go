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
  DEMO_IDS,
  getDemandPressureInsight,
  getMockDemandPressure,
  postAuditArbitrage,
  postRequestUnderwriting,
  type InvoiceDraft,
  type MsmeInsightResponse,
  type MsmeDemandPressureSummary,
} from "@/lib/api";
import { streamText } from "@/lib/text-stream";

type Scene = "alert" | "scan" | "contract" | "offer";
const ACTIVE_INVOICE_KEY = "think-n-go-active-invoice";

// Demo-fixed cash-on-hand for Ahmad. Funding split is total = cash + BNPL.
// Keeps the mobile, swarm-console, and underwriting reasoning aligned to one number.
const MERCHANT_CASH_ON_HAND_RM = 500;

function parseNetDays(value: string | undefined) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : escrowDraft.termDays;
}

function buildEscrowDraft(summary: MsmeDemandPressureSummary | null, invoice: InvoiceDraft | null) {
  const totalRm =
    invoice?.total || summary?.calculation_trace.typical_large_outflow_rm || escrowDraft.totalRm;
  const supplierName = invoice?.supplier.name || escrowDraft.wholesalerName;
  const ownFundsRm = Math.min(MERCHANT_CASH_ON_HAND_RM, totalRm);
  const bnplRm = Math.max(0, totalRm - ownFundsRm);

  return {
    ...escrowDraft,
    invoiceNum: invoice?.invoice_num ?? escrowDraft.invoiceNum,
    invoiceRef: invoice?.invoice_ref ?? escrowDraft.invoiceRef,
    wholesalerName: supplierName,
    supplierPhone: invoice?.supplier.phone ?? escrowDraft.supplierPhone,
    supplierLocation: invoice?.supplier.location ?? escrowDraft.supplierLocation,
    totalRm,
    bnplRm,
    ownFundsRm,
    termDays: parseNetDays(invoice?.terms.net_days),
    issueDate: invoice?.issue_date ?? escrowDraft.issueDate,
    dueDate: invoice?.terms.due_date ?? escrowDraft.dueDate,
    repaymentSweepPct: 5,
    dispatchEta: invoice?.terms.delivery_terms || escrowDraft.dispatchEta,
    description: invoice?.description || invoice?.notes || escrowDraft.description,
    receiverName: invoice?.receiver.name || escrowDraft.receiverName,
    receiverPhone: invoice?.receiver.phone ?? escrowDraft.receiverPhone,
    receiverLocation: invoice?.receiver.location ?? escrowDraft.receiverLocation,
    invoiceItems:
      invoice?.items.map((item) => ({
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })) ?? escrowDraft.invoiceItems,
    notes: invoice?.notes ?? escrowDraft.notes,
  };
}

export default function MobileMockPage() {
  const [scene, setScene] = useState<Scene>("alert");
  const [offerSettled, setOfferSettled] = useState(false);
  const [incomingDiscountPct, setIncomingDiscountPct] = useState(2.0);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [summary, setSummary] = useState<MsmeDemandPressureSummary | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceDraft | null>(null);
  const [insight, setInsight] = useState<MsmeInsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [underwritingText, setUnderwritingText] = useState<string>("");
  const [arbitrageText, setArbitrageText] = useState<string>("");
  const [swarmPhase, setSwarmPhase] = useState<string>("idle");

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
            setInsight(insight);
          }
        } catch (insightError) {
          if (!cancelled) {
            setInsight(null);
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
          setInsight(null);
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
      if (event.type === "swarm:phase-changed") {
        setSwarmPhase(event.payload.phase);
        return;
      }
      if (event.type === "wholesaler:offer-sent") {
        setIncomingDiscountPct(event.payload.discountPct);
        setOfferSettled(false);
        setActiveContractId(event.payload.escrowId);
        setArbitrageText("");
        setScene("offer");

        // Fire audit-arbitrage in the background, stream reasoning into UI
        if (event.payload.escrowId) {
          void postAuditArbitrage({
            contract_id: event.payload.escrowId,
            discount_rate: event.payload.discountPct / 100,
          })
            .then((resp) => {
              streamText(resp.reasoning_text, (t) => setArbitrageText(t));
            })
            .catch((err) => {
              console.warn("audit-arbitrage failed", err);
              setArbitrageText("+RM 18.50 vs holding 14d at 4% APY. ACCEPT.");
            });
        }
      }
      if (event.type === "system:reset") {
        setScene("alert");
        setOfferSettled(false);
        setActiveContractId(null);
        setUnderwritingText("");
        setArbitrageText("");
        setSwarmPhase("idle");
      }
    }, [])
  );

  function fundOrder() {
    publish({
      type: "merchant:bnpl-funded",
      payload: {
        escrowId: liveDraft.escrowId,
        amount: liveDraft.totalRm,
        bnpl: liveDraft.bnplRm,
        cash: liveDraft.ownFundsRm,
      },
    });
    setScene("scan");
  }

  async function lockEscrow() {
    setUnderwritingText("");

    let realContractId: string | null = null;
    try {
      const resp = await postRequestUnderwriting({
        merchant_id: DEMO_IDS.merchants.ahmad,
        supplier_id: DEMO_IDS.wholesaler,
        principal_amount: liveDraft.totalRm,
      });
      realContractId = resp.contract_id;
      setActiveContractId(realContractId);
      streamText(resp.reasoning_text, (t) => setUnderwritingText(t));
    } catch (err) {
      console.warn("underwriting failed, using fallback id", err);
      setUnderwritingText(
        "Approved RM 500 BNPL on top of RM 500 cash. Repayment via 5% sweep on daily QR receipts."
      );
    }

    publish({
      type: "merchant:escrow-locked",
      payload: {
        escrowId: realContractId ?? liveDraft.escrowId,
        amount: liveDraft.totalRm,
        termDays: liveDraft.termDays,
        merchantName: "Ahmad bin Yusof",
        business: liveDraft.receiverName || "Ayam Gepuk Mak Cik",
      },
    });
    setScene("alert");
  }

  function acceptOffer() {
    const discountRm = Math.round((liveDraft.totalRm * incomingDiscountPct) / 100);
    publish({
      type: "merchant:offer-accepted",
      payload: {
        escrowId: activeContractId ?? liveDraft.escrowId,
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
              insight={insight}
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
              underwritingText={underwritingText}
              lockDisabled={["t1", "t2", "t3", "t4", "t5"].includes(swarmPhase)}
            />
          )}
          {scene === "offer" && (
            <ScreenMerchantOffer
              draft={liveDraft}
              discountPct={incomingDiscountPct}
              onAccept={acceptOffer}
              onDecline={declineOffer}
              settled={offerSettled}
              arbitrageText={arbitrageText}
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
