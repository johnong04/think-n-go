"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { ConnectorState } from "@/lib/swarm-machine";

type Props = {
  state: ConnectorState;
  /** "handoff" connector renders a wider dashed yellow S-curve with a label badge */
  variant?: "default" | "handoff";
};

export function FlowConnector({ state, variant = "default" }: Props) {
  const isHandoff = variant === "handoff";
  const height = isHandoff ? 56 : 36;
  // Same-agent: subtle S-curve nudging right then left so the wire reads as a wire, not a line.
  // Handoff: wider sweep emphasizing the cross-agent jump.
  const path = isHandoff
    ? `M 50,0 C 28,${height * 0.4} 72,${height * 0.6} 50,${height}`
    : `M 50,0 C 60,${height * 0.45} 40,${height * 0.55} 50,${height}`;

  const stroke =
    state === "active"
      ? "var(--tng-yellow)"
      : state === "done"
        ? "var(--tng-blue)"
        : "var(--stroke-soft)";

  const pathId = useId().replace(/:/g, "_");

  return (
    <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="block"
        aria-hidden="true"
      >
        <defs>
          <path id={pathId} d={path} />
        </defs>
        <use
          href={`#${pathId}`}
          fill="none"
          stroke={stroke}
          strokeWidth={isHandoff ? 2.5 : 2}
          strokeDasharray={state === "active" || isHandoff ? "5 5" : "0"}
          className={cn(state === "active" && "animate-dash")}
        />
        {state === "active" && (
          <circle r="3.5" fill="var(--tng-yellow)">
            <animateMotion dur="1.2s" repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        )}
      </svg>
      {isHandoff && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span
            className={cn(
              "rounded-full border bg-paper px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]",
              state === "active"
                ? "border-tng-yellow text-tng-blue-deep"
                : state === "done"
                  ? "border-tng-blue text-tng-blue"
                  : "border-stroke-soft text-muted-foreground"
            )}
          >
            handoff
          </span>
        </div>
      )}
    </div>
  );
}
