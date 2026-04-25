import { Signal, Wifi, BatteryFull } from "lucide-react";

type Props = {
  /** Time string e.g. "23:34" */
  time?: string;
};

export function StatusBar({ time = "23:34" }: Props) {
  return (
    <div className="flex h-7 items-center justify-between px-5 text-[12px] font-semibold text-white">
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
        <BatteryFull className="size-4" />
      </div>
    </div>
  );
}
