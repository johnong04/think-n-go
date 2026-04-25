"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "yellow";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary: "bg-tng-blue-app text-white hover:bg-tng-blue-app-deep",
  secondary: "border border-tng-blue-app bg-white text-tng-blue-app hover:bg-tng-blue-app/5",
  yellow: "bg-tng-yellow text-ink hover:bg-tng-yellow/90",
};

export function TngButton({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
    />
  );
}
