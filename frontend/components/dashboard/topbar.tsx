type Props = Record<string, never>;

export function Topbar(_props?: Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-stroke-soft bg-paper px-6">
      <Wordmark />
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-up" />
        wholesaler · institutional node
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
