import { Sparkles } from "lucide-react";

export function SwarmPlaceholder() {
  return (
    <aside className="relative flex min-h-screen flex-col gap-6 border-l border-tng-blue bg-gradient-to-b from-paper to-tng-blue-tint p-6">
      <div className="inline-flex items-center gap-2 self-start rounded-xl bg-tng-yellow px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink animate-swarm-pulse">
        <span className="size-1.5 rounded-full bg-ink" />
        SWARM ACTIVE
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 border border-dashed border-stroke-soft p-8 text-center">
        <Sparkles className="size-6 text-muted-foreground" />
        <p className="font-editorial text-base italic leading-snug text-muted-foreground">
          Swarm console arrives in Phase 3
        </p>
      </div>
    </aside>
  );
}
