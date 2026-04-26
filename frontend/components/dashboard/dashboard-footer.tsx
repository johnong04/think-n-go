"use client";

import { useState } from "react";
import { postDemoReset } from "@/lib/api";
import { publish } from "@/lib/demo-bus";

export function DashboardFooter() {
  const [busy, setBusy] = useState(false);

  async function handleReset() {
    if (busy) return;
    setBusy(true);
    try {
      await postDemoReset();
      publish({ type: "system:reset", payload: {} });
    } catch (err) {
      console.warn("demo reset failed", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="flex items-center justify-between border-t border-stroke-soft bg-paper px-6 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
      <span>
        <span className="text-ink">Think&apos;n Go</span> · Agentic Liquidity Engine for Malaysian MSMEs
      </span>
      <div className="flex items-center gap-4">
        <span>TNG Digital Finhack 2026 · Innovation Track</span>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="lowercase opacity-40 transition-opacity hover:opacity-100 disabled:opacity-20"
          title="wipe + reseed db"
        >
          [{busy ? "resetting…" : "reset"}]
        </button>
      </div>
    </footer>
  );
}
