"use client";

import { useEffect, useRef } from "react";

export const BUS_CHANNEL = "think-n-go-bus";

export type BusEvent =
  | { type: "merchant:bnpl-funded";       payload: { escrowId: string; amount: number; bnpl: number } }
  | { type: "merchant:escrow-locked";     payload: { escrowId: string; amount: number; termDays: number } }
  | { type: "merchant:offer-accepted";    payload: { escrowId: string; discountPct: number; payout: number } }
  | { type: "wholesaler:offer-sent";      payload: { escrowId: string; discountPct: number; clientName: string } };

export function publish(event: BusEvent) {
  if (typeof window === "undefined") return;
  const ch = new BroadcastChannel(BUS_CHANNEL);
  ch.postMessage(event);
  ch.close();
}

export function useDemoBus(handler: (event: BusEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const ch = new BroadcastChannel(BUS_CHANNEL);
    ch.onmessage = (e: MessageEvent<BusEvent>) => ref.current(e.data);
    return () => ch.close();
  }, []);
}
