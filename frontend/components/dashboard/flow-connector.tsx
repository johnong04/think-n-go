"use client";

import { cn } from "@/lib/utils";
import type { ConnectorState } from "@/lib/swarm-machine";

type Props = {
  state: ConnectorState;
  /** "handoff" connector renders dashed yellow with a label badge */
  variant?: "default" | "handoff";
};

export function FlowConnector({ state, variant = "default" }: Props) {
  const isHandoff = variant === "handoff";
  const height = isHandoff ? 56 : 36;
  // Subtle S-curve: vertical with a small horizontal nudge mid-path
  const path = isHandoff
    ? `M 50,0 C 30,${height * 0.4} 70,${height * 0.6} 50,${height}`
    : `M 50,0 C 50,${height * 0.5} 50,${height * 0.5} 50,${height}`;

  const stroke =
    state === "active"
      ? "var(--tng-yellow)"
      : state === "done"
        ? "var(--tng-blue)"
        : "var(--stroke-soft)";

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
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={isHandoff ? 2.5 : 2}
          strokeDasharray={state === "active" || isHandoff ? "5 5" : "0"}
          className={cn(state === "active" && "animate-dash")}
        />
        {state === "active" && (
          <circle r="3.5" fill="var(--tng-yellow)">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
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
