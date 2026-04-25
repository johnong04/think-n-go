"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

export function AITextLoading({ text, className }: Props) {
  const chars = Array.from(text);
  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.02,
            duration: 0.3,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
