"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { ScreenMerchantAlert } from "@/components/mobile/screen-merchant-alert";
import { ScreenMerchantScan } from "@/components/mobile/screen-merchant-scan";
import { ScreenMerchantContract } from "@/components/mobile/screen-merchant-contract";
import { ScreenMerchantOffer } from "@/components/mobile/screen-merchant-offer";
import { publish, useDemoBus } from "@/lib/demo-bus";
import { escrowDraft } from "@/lib/mobile-mock-data";

type Scene = "alert" | "scan" | "contract" | "offer";

export default function MobileMockPage() {
  const [scene, setScene] = useState<Scene>("alert");
  const [offerSettled, setOfferSettled] = useState(false);
  const [incomingDiscountPct, setIncomingDiscountPct] = useState(2.0);

  // Cross-window: when wholesaler's swarm fires the offer, surface it on M4
  useDemoBus(
    useCallback((event) => {
      if (event.type === "wholesaler:offer-sent") {
        setIncomingDiscountPct(event.payload.discountPct);
        setOfferSettled(false);
        setScene("offer");
      }
    }, [])
  );

  // Scenario B step 1 — merchant fires bnpl-funded which triggers the dashboard's swarm
  function fundOrder() {
    publish({
      type: "merchant:bnpl-funded",
      payload: { escrowId: escrowDraft.escrowId, amount: escrowDraft.totalRm, bnpl: escrowDraft.bnplRm },
    });
    setScene("scan");
  }

  // Scenario B step 3 — merchant fires escrow-locked when contract is confirmed
  function lockEscrow() {
    publish({
      type: "merchant:escrow-locked",
      payload: {
        escrowId: escrowDraft.escrowId,
        amount: escrowDraft.totalRm,
        termDays: escrowDraft.termDays,
        merchantName: "Ahmad bin Yusof",
        business: "Restoran Selera Kampung",
      },
    });
    // After the lock, mobile sits in a "locked" state on the contract screen — we don't reuse M4 for Scenario B
    setScene("alert");
  }

  // Scenario A response — merchant accepts the wholesaler's early-release offer
  function acceptOffer() {
    const discountRm = Math.round((escrowDraft.totalRm * incomingDiscountPct) / 100);
    publish({
      type: "merchant:offer-accepted",
      payload: {
        escrowId: escrowDraft.escrowId,
        discountPct: incomingDiscountPct,
        payout: escrowDraft.totalRm - discountRm,
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
          {scene === "alert" && <ScreenMerchantAlert onFundOrder={fundOrder} />}
          {scene === "scan" && (
            <ScreenMerchantScan
              onScanComplete={() => setScene("contract")}
              onBack={() => setScene("alert")}
            />
          )}
          {scene === "contract" && (
            <ScreenMerchantContract onLock={lockEscrow} onBack={() => setScene("scan")} />
          )}
          {scene === "offer" && (
            <ScreenMerchantOffer
              discountPct={incomingDiscountPct}
              onAccept={acceptOffer}
              onDecline={declineOffer}
              settled={offerSettled}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tiny dev reset chip — bottom-right, non-themed */}
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
