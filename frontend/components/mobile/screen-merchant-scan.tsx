"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { ScanLine } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { escrowDraft, fmtRm } from "@/lib/mobile-mock-data";

type Props = {
  onScanComplete: () => void;
  onBack: () => void;
};

export function ScreenMerchantScan({ onScanComplete, onBack }: Props) {
  useEffect(() => {
    const t = setTimeout(onScanComplete, 1800);
    return () => clearTimeout(t);
  }, [onScanComplete]);

  return (
    <>
      <TngAppHeader title="Scan QR" onBack={onBack} />

      <div className="flex flex-1 flex-col items-center justify-start gap-6 px-5 pb-6">
        <p className="text-center text-[13px] text-white/80">
          Hold steady — scanning {escrowDraft.wholesalerName}&apos;s DuitNow QR
        </p>

        <div className="relative grid size-64 place-items-center overflow-hidden rounded-3xl border-2 border-tng-red bg-tng-red/5">
          {/* Corner brackets */}
          <span className="absolute left-3 top-3 size-6 border-l-2 border-t-2 border-white" />
          <span className="absolute right-3 top-3 size-6 border-r-2 border-t-2 border-white" />
          <span className="absolute bottom-3 left-3 size-6 border-b-2 border-l-2 border-white" />
          <span className="absolute bottom-3 right-3 size-6 border-b-2 border-r-2 border-white" />

          <ScanLine className="size-20 text-white/40" />

          <motion.span
            className="absolute left-0 right-0 h-[2px] bg-tng-yellow shadow-[0_0_12px_var(--tng-yellow)]"
            initial={{ top: "8%" }}
            animate={{ top: "92%" }}
            transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
        </div>

        <div className="rounded-2xl bg-tng-red px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Malaysia National QR
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mt-4 w-full rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm"
        >
          <p className="text-[10px] uppercase tracking-[0.1em] opacity-75">Detected</p>
          <p className="mt-1 text-base font-semibold">{escrowDraft.wholesalerName}</p>
          <p className="text-[12px] opacity-80">
            {fmtRm(escrowDraft.totalRm)} · Net-{escrowDraft.termDays} terms
          </p>
        </motion.div>
      </div>
    </>
  );
}
