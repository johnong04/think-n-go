import { TrendingUp } from "lucide-react";
import { bannerCopy } from "@/lib/mock-data";
import type { Mode } from "@/lib/mock-data";
import type { SwarmPhase } from "@/lib/swarm-machine";

type Props = {
  mode: Mode;
  phase: SwarmPhase;
};

export function ArbitrageBanner({ mode, phase }: Props) {
  const isRunning = phase !== "idle" && phase !== "settled";
  if (isRunning) return null;

  const key = phase === "settled" ? "settled" : "idle";
  const copy = bannerCopy[mode][key];

  return (
    <section className="flex items-center justify-between border border-t-tng-blue border-x-stroke-soft border-b-stroke-soft bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center bg-tng-blue-tint text-tng-blue">
          <TrendingUp className="size-5" />
        </div>
        <div>
          <h3 className="font-editorial text-lg italic leading-tight text-tng-blue-deep">
            {copy.title}
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {copy.body}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 bg-tng-yellow px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-tng-yellow/90"
      >
        {copy.cta}
      </button>
    </section>
  );
}
