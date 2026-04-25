import { Check, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EscrowStatus } from "@/lib/mock-data";

const styles: Record<EscrowStatus, { bg: string; fg: string; Icon: React.ElementType | null }> = {
  "Net-14 Locked":   { bg: "bg-tng-blue-tint",   fg: "text-tng-blue-deep", Icon: Lock },
  "Net-30 Escrow":   { bg: "bg-tng-blue-tint",   fg: "text-tng-blue-deep", Icon: Lock },
  "Release Pending": { bg: "bg-tng-yellow-tint", fg: "text-ink",           Icon: Clock },
  "Posted":          { bg: "bg-transparent",     fg: "text-up",            Icon: Check },
};

export function StatusPill({ status }: { status: EscrowStatus }) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.04em]",
        s.bg,
        s.fg,
        status === "Posted" && "border border-up/40"
      )}
    >
      {s.Icon && <s.Icon className="size-3" />}
      {status}
    </span>
  );
}
