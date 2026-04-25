import { Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { agentBanners } from "@/lib/mock-data";

type Props = {
  agent: "wholesaler" | "merchant";
  /** "active" highlights the banner when any of the agent's tools is running */
  isActive: boolean;
};

const ICONS = { wholesaler: Briefcase, merchant: Sparkles } as const;

export function AgentBanner({ agent, isActive }: Props) {
  const meta = agentBanners[agent];
  const Icon = ICONS[agent];
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md border bg-card px-3 py-2 transition-colors",
        isActive ? "border-tng-yellow shadow-[0_0_0_3px_var(--swarm-glow)]" : "border-stroke-soft"
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full transition-colors",
          isActive ? "bg-tng-yellow text-ink" : "bg-tng-blue-tint text-tng-blue-deep"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex-1">
        <p className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink leading-none">
          {meta.label}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{meta.role}</p>
      </div>
      {isActive && (
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-tng-blue-deep">
          running
        </span>
      )}
    </div>
  );
}
