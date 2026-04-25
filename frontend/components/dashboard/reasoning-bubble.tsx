"use client";

import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import { AITextLoading } from "@/components/ui/ai-text-loading";

type Props = {
  text: string;
};

export function ReasoningBubble({ text }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="ml-2 flex max-w-[260px] gap-2 rounded-md border border-tng-yellow bg-tng-yellow-tint p-2"
    >
      <Lightbulb className="size-3.5 shrink-0 text-tng-blue-deep" />
      <AITextLoading text={text} className="font-mono text-[10px] leading-snug text-tng-blue-deep" />
    </motion.div>
  );
}
