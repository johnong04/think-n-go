import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function TngCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-[20px] bg-white p-5 text-ink shadow-sm", className)}
    />
  );
}
