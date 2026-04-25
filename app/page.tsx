"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  Database,
  Gauge,
  HandCoins,
  Landmark,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

type DemoStage = 0 | 1 | 2 | 3 | 4;

const stages = [
  "Baseline",
  "Demand spike",
  "BNPL top-up",
  "Escrow locked",
  "Liquidity released",
] as const;

const toolCalls = [
  ["analyze_qr_velocity", "DuitNow QR sales up 38% over trailing 7 days."],
  ["forecast_stockout", "Peak demand will exhaust cooking oil stock in 3 days."],
  ["calculate_bnpl_shortfall", "Recommended order requires RM 500 fractional funding."],
  ["lock_escrow", "RM 2,450 committed to TNG GO+ escrow with ACID ledger entry."],
  ["compute_yield_arbitrage", "2% early-release discount beats 14-day receivable drag."],
  ["release_payment", "Wholesaler liquidity settled; merchant repayment stays automated."],
];

const ledgerRows = [
  ["15:42:10", "escrow.lock", "Merchant A-104", "+RM 2,450.00", "posted"],
  ["15:42:14", "bnpl.drawdown", "TNG Float", "-RM 500.00", "posted"],
  ["15:42:21", "go_plus.yield", "Escrow A-104", "+RM 0.34", "streaming"],
  ["15:43:02", "discount.offer", "Wholesaler W-22", "2.0%", "accepted"],
  ["15:43:08", "escrow.release", "Supplier Bank", "-RM 2,401.00", "posted"],
];

const pipeline = [
  ["Order raised", "2x festive inventory", "complete"],
  ["BNPL covered", "RM 500 shortfall", "complete"],
  ["Escrow earning", "GO+ yield active", "active"],
  ["Offer generated", "2% early release", "active"],
  ["Settlement", "Receivable liquidated", "queued"],
];

function currency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [stage, setStage] = useState<DemoStage>(0);
  const [mode, setMode] = useState<"unified" | "merchant" | "wholesaler">("unified");

  const metrics = useMemo(() => {
    const multiplier = stage + 1;

    return {
      escrow: 145000 + stage * 2450,
      liquidity: stage >= 4 ? 82400 : 37400 + stage * 6600,
      merchants: 128 + stage * 7,
      yield: 1860 + multiplier * 34,
      qrVelocity: 11200 + stage * 1640,
      stockout: Math.max(3, 7 - stage),
      shortfall: stage >= 2 ? 500 : 0,
      repayment: 34 + stage * 11,
      receivables: 241000 + stage * 12400,
      healthyMsmes: 42 + stage * 6,
    };
  }, [stage]);

  const activeTools = toolCalls.slice(0, Math.min(toolCalls.length, stage + 2));

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TNG Digital Finhack 2026 · Innovation Track</p>
          <h1>Think 'n Go Command Center</h1>
        </div>
        <div className="mode-switch" aria-label="Dashboard mode">
          {(["unified", "merchant", "wholesaler"] as const).map((item) => (
            <button
              className={mode === item ? "is-active" : ""}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="status-grid" aria-label="Financial status">
        <Metric icon={<LockKeyhole />} label="Escrow locked" value={currency(metrics.escrow)} trend="+ live ledger" />
        <Metric icon={<Zap />} label="Liquidity available" value={currency(metrics.liquidity)} trend="instant release" />
        <Metric icon={<WalletCards />} label="Active MSMEs" value={metrics.merchants.toString()} trend="+ healthy cohort" />
        <Metric icon={<TrendingUp />} label="GO+ yield generated" value={currency(metrics.yield)} trend="daily accrual" />
      </section>

      <section className="workspace">
        <aside className={`pane ${mode === "wholesaler" ? "is-muted" : ""}`}>
          <PaneTitle icon={<ChartNoAxesCombined />} title="Merchant Treasury" subtitle="Agentic CFO for QR-first micro-merchants" />
          <div className="treasury-hero">
            <div>
              <span>QR velocity</span>
              <strong>{currency(metrics.qrVelocity)}</strong>
              <small>Trailing 7-day DuitNow QR intake</small>
            </div>
            <Gauge className="hero-icon" />
          </div>
          <div className="alert-row">
            <Sparkles />
            <div>
              <strong>Restock in {metrics.stockout} days</strong>
              <span>Recommend 2x bulk order before weekend demand spike.</span>
            </div>
          </div>
          <div className="split-row">
            <MiniStat label="BNPL shortfall" value={currency(metrics.shortfall)} />
            <MiniStat label="Repayment progress" value={`${metrics.repayment}%`} />
          </div>
          <div className="yield-line">
            <span>Escrow yield advantage</span>
            <div><b>TNG GO+</b><i /><b>Traditional bank</b></div>
          </div>
        </aside>

        <section className="flow-panel" aria-label="Agent orchestration">
          <div className="scenario">
            <div>
              <p className="eyebrow">Live scenario</p>
              <h2>{stages[stage]}</h2>
            </div>
            <button className="primary-action" onClick={() => setStage(((stage + 1) % 5) as DemoStage)} type="button">
              {stage === 0 ? <Play /> : <RefreshCw />}
              Advance Demo
            </button>
          </div>

          <div className="flow-map">
            {pipeline.map(([title, detail, state], index) => (
              <div className={`flow-node ${state} ${index <= stage ? "is-lit" : ""}`} key={title}>
                <span>{index <= stage ? <Check /> : <ArrowRight />}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>

          <div className="agent-panel">
            <PaneTitle icon={<Database />} title="Visible agent tool-calling" subtitle="Structured actions, not chatbot prose" />
            <div className="tool-list">
              {activeTools.map(([name, detail], index) => (
                <div className="tool-call" key={name}>
                  <code>{name}</code>
                  <span>{detail}</span>
                  <b>{index === activeTools.length - 1 ? "running" : "done"}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className={`pane ${mode === "merchant" ? "is-muted" : ""}`}>
          <PaneTitle icon={<HandCoins />} title="Wholesaler Liquidity" subtitle="Receivables converted into cash on demand" />
          <div className="liquidity-number">
            <span>Locked receivables</span>
            <strong>{currency(metrics.receivables)}</strong>
          </div>
          <button className="liquidity-button" onClick={() => setStage(4)} type="button">
            <ArrowDownToLine />
            Generate Instant Liquidity
          </button>
          <div className="health-grid">
            <MiniStat label="Healthy MSMEs" value={metrics.healthyMsmes.toString()} />
            <MiniStat label="Offer discount" value="2.0%" />
          </div>
          <div className="privacy-note">
            <ShieldCheck />
            <span>Wholesaler sees cohort health and offer eligibility, not raw merchant balances.</span>
          </div>
        </aside>
      </section>

      <section className="ledger-section">
        <div>
          <PaneTitle icon={<Landmark />} title="ACID ledger proof" subtitle="Escrow locks, BNPL drawdowns, yield, and releases" />
          <div className="ledger-table">
            {ledgerRows.map(([time, event, account, amount, status]) => (
              <div className="ledger-row" key={`${time}-${event}`}>
                <span>{time}</span>
                <code>{event}</code>
                <b>{account}</b>
                <strong>{amount}</strong>
                <em>{status}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="demo-strip">
          <BadgeCheck />
          <p>
            The demo should make one thing obvious: liquidity moves because the AI can read demand,
            price the shortfall, lock escrow, and release receivables with ledger-backed certainty.
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{trend}</small>
    </div>
  );
}

function PaneTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="pane-title">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
