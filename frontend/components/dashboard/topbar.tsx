import Link from "next/link";

type Props = Record<string, never>;

export function Topbar(_props?: Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-stroke-soft bg-paper px-6">
      <Wordmark />
      <div className="flex items-center gap-5">
        <nav className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Link href="/dashboard" className="hover:text-ink">
            Dashboard
          </Link>
          <Link href="/mobile-mock" className="hover:text-ink">
            Merchant Demo
          </Link>
          <Link href="/invoice-demo" className="hover:text-ink">
            Invoice Demo
          </Link>
        </nav>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-up" />
          wholesaler - institutional node
        </div>
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-xl font-bold italic leading-none tracking-tight">
        <span className="text-ink">Think</span>
        <span className="text-tng-yellow">&apos;n </span>
        <span className="text-tng-blue">Go</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Agentic Liquidity
      </span>
    </div>
  );
}
