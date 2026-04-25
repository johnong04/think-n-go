"use client";

import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/mock-data";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="inline-flex items-center border border-stroke-soft p-[2px]">
      {(["merchant", "wholesaler"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "h-7 px-3 text-xs font-medium uppercase tracking-[0.08em] transition-colors",
            mode === m ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
