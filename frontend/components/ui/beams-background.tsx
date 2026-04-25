"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** 0–1 — how visible the beams are. Default 0.18 for atmospheric subtlety. */
  intensity?: number;
};

export function BeamsBackground({ className, intensity = 0.18 }: Props) {
  const beams = [
    { color: "var(--tng-blue)",   left: "8%",  delay: 0,   duration: 8 },
    { color: "var(--tng-yellow)", left: "32%", delay: 1.5, duration: 10 },
    { color: "var(--tng-blue)",   left: "55%", delay: 3,   duration: 9 },
    { color: "var(--tng-yellow)", left: "78%", delay: 0.8, duration: 11 },
  ];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {beams.map((b, i) => (
        <motion.div
          key={i}
          className="absolute top-[-20%] h-[140%] w-[2px] origin-top blur-[2px]"
          style={{ left: b.left, background: `linear-gradient(180deg, transparent, ${b.color}, transparent)`, opacity: intensity }}
          initial={{ y: "-30%" }}
          animate={{ y: "30%" }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
