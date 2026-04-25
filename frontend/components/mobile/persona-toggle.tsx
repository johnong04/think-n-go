"use client";

import { cn } from "@/lib/utils";

export type Persona = "merchant" | "wholesaler";

type Props = {
  persona: Persona;
  onChange: (p: Persona) => void;
};

export function PersonaToggle({ persona, onChange }: Props) {
  return (
    <div className="mx-5 mt-2 inline-flex w-[calc(100%-2.5rem)] items-center rounded-full bg-white/15 p-[3px] backdrop-blur-sm">
      {(["merchant", "wholesaler"] as Persona[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "h-8 flex-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
            persona === p ? "bg-white text-tng-blue-app" : "text-white/70 hover:text-white"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
