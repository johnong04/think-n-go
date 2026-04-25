"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ConnectorState } from "@/lib/swarm-machine";

type Props = {
  state: ConnectorState;
  /** "handoff" connector renders a wider variant with a label badge */
  variant?: "default" | "handoff";
};

export function FlowConnector({ state, variant = "default" }: Props) {
  const isHandoff = variant === "handoff";
  const height = isHandoff ? 64 : 44;
  const width = isHandoff ? 32 : 24;
  const cx = width / 2;
  // Clean straight vertical line — pixel-perfect viewBox, no stretch.
  const path = `M ${cx},4 L ${cx},${height - 4}`;

  const stroke =
    state === "active"
      ? "var(--tng-yellow)"
      : state === "done"
        ? "var(--tng-blue)"
        : "var(--stroke-soft)";

  const rawId = useId().replace(/:/g, "_");
  const pathId = `fc-path-${rawId}`;
  const arrowId = `fc-arrow-${rawId}`;

  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.6 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.6 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformOrigin: "top center" }}
      className="relative flex justify-center"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <path id={pathId} d={path} />
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0,1 L 10,5 L 0,9 z" fill={stroke} />
          </marker>
        </defs>
        <use
          href={`#${pathId}`}
          fill="none"
          stroke={stroke}
          strokeWidth={isHandoff ? 1.75 : 1.5}
          strokeDasharray="4 4"
          markerEnd={`url(#${arrowId})`}
          className="animate-dash"
        />
        {state === "active" && (
          <circle r="2.5" fill="var(--tng-yellow)">
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
    </motion.div>
  );
}
