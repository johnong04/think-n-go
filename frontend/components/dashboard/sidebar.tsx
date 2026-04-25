import { LayoutDashboard, Database, Zap, Sparkles, History, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Database,        label: "Data Streams" },
  { icon: Zap,             label: "Execution" },
  { icon: Sparkles,        label: "AI Console" },
  { icon: History,         label: "History" },
];

const footerItems = [
  { icon: Settings, label: "Settings" },
  { icon: BookOpen, label: "Documentation" },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-stroke-soft bg-paper">
      <div className="p-6">
        <div className="mb-1 font-display text-base font-bold leading-none tracking-tight text-ink">
          Human Business
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Institutional Node
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
        </nav>
      </div>

      <div className="border-t border-stroke-soft p-3">
        <nav className="flex flex-col gap-1">
          {footerItems.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function NavRow({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-11 items-center gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-paper-grid hover:text-ink",
        active && "bg-paper-grid text-ink"
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-tng-blue" />}
      <Icon className="size-4" />
      {label}
    </button>
  );
}
