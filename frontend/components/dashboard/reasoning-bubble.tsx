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
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="ml-12 flex gap-2 rounded-md border border-tng-yellow bg-tng-yellow-tint p-2.5"
    >
      <Lightbulb className="size-3.5 shrink-0 text-tng-blue-deep" />
      <AITextLoading text={text} className="font-mono text-[10px] leading-snug text-tng-blue-deep" />
    </motion.div>
  );
}
