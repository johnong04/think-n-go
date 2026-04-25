import { ArrowRight, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escrowRows, formatRm } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";

export function EscrowTable() {
  return (
    <section className="border border-stroke-soft bg-card">
      <header className="flex items-center justify-between border-b border-stroke-soft px-6 py-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          Escrow Pipeline
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
              Merchant Entity
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
          {escrowRows.map((row) => (
            <TableRow
              key={row.id}
              className="group relative border-b border-stroke-soft transition-colors last:border-b-0 hover:bg-paper-grid"
            >
              <TableCell className="relative px-6 py-4 text-sm font-medium text-ink">
                <span className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-tng-blue transition-transform group-hover:scale-y-100" />
                {row.merchant}
              </TableCell>
              <TableCell className="py-4">
                <StatusPill status={row.status} />
              </TableCell>
              <TableCell className="py-4 text-right font-mono text-sm tabular-nums text-ink">
                {formatRm(row.value)}
              </TableCell>
              <TableCell className="py-4 pr-6">
                <button
                  type="button"
                  className="grid size-7 place-items-center text-muted-foreground hover:text-ink"
                >
                  <MoreVertical className="size-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
