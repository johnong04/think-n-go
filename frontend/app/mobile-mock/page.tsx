"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { PersonaToggle, type Persona } from "@/components/mobile/persona-toggle";
import { ScreenMerchantAlert } from "@/components/mobile/screen-merchant-alert";
import { ScreenMerchantScan } from "@/components/mobile/screen-merchant-scan";
import { ScreenMerchantContract } from "@/components/mobile/screen-merchant-contract";
import { ScreenMerchantOffer } from "@/components/mobile/screen-merchant-offer";
import { ScreenWholesalerClients } from "@/components/mobile/screen-wholesaler-clients";
import { ScreenWholesalerLiquidate } from "@/components/mobile/screen-wholesaler-liquidate";
import { ScreenWholesalerAwaiting } from "@/components/mobile/screen-wholesaler-awaiting";
import { publish, useDemoBus } from "@/lib/demo-bus";
import { escrowDraft, offerPayload } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type MerchantScene = "alert" | "scan" | "contract" | "offer";
type WholesalerScene = "clients" | "liquidate" | "awaiting";

export default function MobileMockPage() {
  const [persona, setPersona] = useState<Persona>("merchant");

  // Merchant flow state
  const [merchantScene, setMerchantScene] = useState<MerchantScene>("alert");
  const [offerSettled, setOfferSettled] = useState(false);
  const [incomingDiscountPct, setIncomingDiscountPct] = useState(offerPayload.defaultDiscountPct);

  // Wholesaler flow state
  const [wholesalerScene, setWholesalerScene] = useState<WholesalerScene>("clients");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [discountPct, setDiscountPct] = useState(offerPayload.defaultDiscountPct);
  const [wholesalerSettled, setWholesalerSettled] = useState(false);

  // Cross-window: when an offer is sent (from this or another window), surface it on the merchant side
  useDemoBus(
    useCallback((event) => {
      if (event.type === "wholesaler:offer-sent") {
        setIncomingDiscountPct(event.payload.discountPct);
        setOfferSettled(false);
        setPersona("merchant");
        setMerchantScene("offer");
      }
      if (event.type === "merchant:offer-accepted") {
        setWholesalerSettled(true);
      }
    }, [])
  );

  // === Merchant click handlers ===
  function fundOrder() {
    publish({
      type: "merchant:bnpl-funded",
      payload: { escrowId: escrowDraft.escrowId, amount: escrowDraft.totalRm, bnpl: escrowDraft.bnplRm },
    });
    setMerchantScene("scan");
  }

  function lockEscrow() {
    publish({
      type: "merchant:escrow-locked",
      payload: { escrowId: escrowDraft.escrowId, amount: escrowDraft.totalRm, termDays: escrowDraft.termDays },
    });
    setMerchantScene("offer");
    setOfferSettled(false);
  }

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
    setMerchantScene("alert");
  }

  // === Wholesaler click handlers ===
  function selectClient(client: ClientRow) {
    setSelectedClient(client);
    setDiscountPct(offerPayload.defaultDiscountPct);
    setWholesalerScene("liquidate");
  }

  function sendOffer() {
    if (!selectedClient) return;
    publish({
      type: "wholesaler:offer-sent",
      payload: {
        escrowId: selectedClient.id,
        discountPct,
        clientName: selectedClient.name,
      },
    });
    setWholesalerSettled(false);
    setWholesalerScene("awaiting");
  }

  function resetWholesaler() {
    setSelectedClient(null);
    setWholesalerSettled(false);
    setWholesalerScene("clients");
  }

  return (
    <PhoneShell>
      <PersonaToggle persona={persona} onChange={setPersona} />

      <AnimatePresence mode="wait">
        {persona === "merchant" ? (
          <motion.div
            key={`m-${merchantScene}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {merchantScene === "alert" && <ScreenMerchantAlert onFundOrder={fundOrder} />}
            {merchantScene === "scan" && (
              <ScreenMerchantScan
                onScanComplete={() => setMerchantScene("contract")}
                onBack={() => setMerchantScene("alert")}
              />
            )}
            {merchantScene === "contract" && (
              <ScreenMerchantContract onLock={lockEscrow} onBack={() => setMerchantScene("scan")} />
            )}
            {merchantScene === "offer" && (
              <ScreenMerchantOffer
                discountPct={incomingDiscountPct}
                onAccept={acceptOffer}
                onDecline={declineOffer}
                settled={offerSettled}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`w-${wholesalerScene}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {wholesalerScene === "clients" && <ScreenWholesalerClients onSelect={selectClient} />}
            {wholesalerScene === "liquidate" && selectedClient && (
              <ScreenWholesalerLiquidate
                client={selectedClient}
                discountPct={discountPct}
                onDiscountChange={setDiscountPct}
                onSend={sendOffer}
                onBack={() => setWholesalerScene("clients")}
              />
            )}
            {wholesalerScene === "awaiting" && selectedClient && (
              <ScreenWholesalerAwaiting
                client={selectedClient}
                discountPct={discountPct}
                settled={wholesalerSettled}
                onReset={resetWholesaler}
              />
            )}
            {/* Fallback if a sub-scene is selected without a client (e.g., after persona switch + back) */}
            {wholesalerScene !== "clients" && !selectedClient && (
              <div className="grid flex-1 place-items-center text-white/80 text-sm">
                Select a client to continue.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick reset for demo: appears as a tiny chip; non-themed so it stays visually subordinate */}
      <button
        type="button"
        onClick={() => {
          setMerchantScene("alert");
          setOfferSettled(false);
          resetWholesaler();
        }}
        className="absolute right-3 top-9 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] text-white/80 hover:bg-black/50"
      >
        reset
      </button>
    </PhoneShell>
  );
}
