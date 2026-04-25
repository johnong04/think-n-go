import { cn } from "@/lib/utils";
import { StatusBar } from "./status-bar";

type Props = {
  children: React.ReactNode;
  /** Defaults to TNG mobile blue */
  bodyTone?: "blue" | "white";
  className?: string;
};

export function PhoneShell({ children, bodyTone = "blue", className }: Props) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper-grid py-8">
      <div
        className={cn(
          "relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[44px] border-[10px] border-ink",
          className
        )}
        style={{
          backgroundColor: bodyTone === "blue" ? "var(--tng-blue-app)" : "#FFFFFF",
        }}
      >
        <StatusBar />
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        <div className="flex h-7 items-center justify-center">
          <span className="h-1 w-32 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
