"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

export function AIStateLoading({ label = "reasoning", className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-tng-blue-deep", className)}>
      <span>{label}</span>
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-tng-yellow"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </span>
    </div>
  );
}
