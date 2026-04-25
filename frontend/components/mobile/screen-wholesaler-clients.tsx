"use client";

import { ChevronRight, Wallet } from "lucide-react";
import { TngAppHeader } from "./tng-app-header";
import { TngCard } from "./tng-card";
import { wholesaler, wholesalerClients, fmtRm } from "@/lib/mobile-mock-data";
import type { ClientRow } from "@/lib/mobile-mock-data";

type Props = {
  onSelect: (client: ClientRow) => void;
};

export function ScreenWholesalerClients({ onSelect }: Props) {
  return (
    <>
      <TngAppHeader title="Receivables" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        <TngCard className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{wholesaler.name}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Outstanding receivables</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{fmtRm(wholesaler.outstandingReceivablesRm)}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-tng-blue-app/10 text-tng-blue-app">
            <Wallet className="size-6" />
          </div>
        </TngCard>

        <div className="flex items-center justify-between text-white">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
            Active clients · {wholesalerClients.length}
          </span>
          <span className="text-[11px] opacity-75">Tap to liquidate</span>
        </div>

        <div className="flex flex-col gap-2">
          {wholesalerClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client)}
              className="group flex items-center gap-3 rounded-[20px] bg-white p-4 text-left transition-colors hover:bg-tng-blue-app/5"
            >
              <div className="grid size-10 place-items-center rounded-full bg-tng-blue-app/10 font-semibold text-tng-blue-app">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">{client.name}</p>
                <p className="text-[11px] text-muted-foreground">{client.business}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.06em]">
                  <span className="rounded bg-tng-blue-app/10 px-1.5 py-0.5 text-tng-blue-deep">
                    Net-{client.termDays}
                  </span>
                  <span className="text-muted-foreground">
                    Day {client.daysIn}/{client.termDays}
                  </span>
                  <span
                    className={
                      client.health === "AAA"
                        ? "ml-auto text-up"
                        : client.health === "AA"
                          ? "ml-auto text-tng-blue"
                          : "ml-auto text-tng-red"
                    }
                  >
                    {client.health}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-bold text-ink tabular-nums">{fmtRm(client.escrowRm)}</p>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
