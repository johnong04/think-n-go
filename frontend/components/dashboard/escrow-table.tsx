import { ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escrowRows, formatRm } from "@/lib/mock-data";
import type { Mode } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";

const merchantViewIds = new Set(["e-1", "e-3"]);

type Props = {
  mode?: Mode;
};

export function EscrowTable({ mode = "wholesaler" }: Props) {
  const visible = mode === "merchant" ? escrowRows.filter((r) => merchantViewIds.has(r.id)) : escrowRows;
  const title = mode === "merchant" ? "My Escrows" : "Escrow Pipeline";
  const col1Header = mode === "merchant" ? "Wholesaler" : "Merchant Entity";
  const ctaLabel = mode === "merchant" ? "Request Release" : "Generate Liquidity";

  return (
    <section className="border border-stroke-soft bg-card">
      <header className="flex items-center justify-between border-b border-stroke-soft px-6 py-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-tng-blue hover:text-tng-blue-deep"
        >
          View Full Register
          <ArrowRight className="size-3.5" />
        </button>
      </header>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-stroke-soft">
            <TableHead className="px-6 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {col1Header}
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Status / Term
            </TableHead>
            <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Settlement Value
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow
              key={row.id}
              className="group relative border-b border-stroke-soft transition-colors last:border-b-0 hover:bg-paper-grid"
            >
              <TableCell className="relative px-6 py-4">
                <span className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-tng-blue transition-transform group-hover:scale-y-100" />
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tng-blue-app/10 font-semibold text-tng-blue-deep">
                    {row.merchant.charAt(0)}
                  </span>
                  <div>
                    <span className="block text-sm font-medium text-ink">{row.merchant}</span>
                    <span className="block text-[11px] text-muted-foreground">{row.business}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-col gap-2">
                  <StatusPill status={row.status} />
                  <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span className="tabular-nums">Day {row.daysIn}/{row.termDays}</span>
                    <span className="relative h-1 w-14 overflow-hidden rounded-full bg-stroke-soft">
                      <span
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${Math.min(100, (row.daysIn / row.termDays) * 100)}%`,
                          background: row.status === "Posted" ? "var(--up)" : "var(--tng-yellow)",
                        }}
                      />
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 text-right font-mono text-sm tabular-nums text-ink">
                {formatRm(row.value)}
              </TableCell>
              <TableCell className="py-4 pr-6 text-right">
                {row.status === "Posted" ? (
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    Settled
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-tng-blue hover:text-tng-blue-deep"
                  >
                    {ctaLabel}
                    <ArrowRight className="size-3" />
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
