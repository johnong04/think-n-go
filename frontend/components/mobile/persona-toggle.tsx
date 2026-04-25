"use client";

import { cn } from "@/lib/utils";

export type Persona = "merchant" | "wholesaler";

type Props = {
  persona: Persona;
  onChange: (p: Persona) => void;
};

export function PersonaToggle({ persona, onChange }: Props) {
  return (
    <div className="mt-1 flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full bg-black/45 p-1 pl-2.5 pr-1 text-[10px] font-mono uppercase tracking-[0.1em] backdrop-blur-md">
        <span className="text-white/55">demo</span>
        {(["merchant", "wholesaler"] as Persona[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "h-6 rounded-full px-3 transition-colors",
              persona === p ? "bg-tng-yellow text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
