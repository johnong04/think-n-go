"use client";

import { cn } from "@/lib/utils";

type Props = {
  tabs: readonly string[];
  active: string;
  onChange?: (tab: string) => void;
};

export function TngTabBar({ tabs, active, onChange }: Props) {
  return (
    <nav className="flex items-end gap-6 border-b border-white/10 px-5 pb-2 text-white">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange?.(tab)}
            className="relative flex flex-col items-center pb-2 text-[14px] font-medium"
          >
            <span className={cn(isActive ? "text-white" : "text-white/55")}>{tab}</span>
            {isActive && (
              <span className="absolute -bottom-0.5 h-[3px] w-10 rounded-full bg-tng-yellow" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
