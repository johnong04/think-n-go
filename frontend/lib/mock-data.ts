import type { SwarmScenario } from "./swarm-machine";

export type ChartPoint = { day: number; baseTrend: number; risk: number | null };

export const liquidityProjection: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const wave = 80000 + Math.sin(i / 4) * 14000 + Math.cos(i / 7) * 7000;
  const drop = i >= 14 && i <= 19 ? 1 : 0;
  const baseTrend = Math.round(wave - drop * 18000);
  const risk = drop ? baseTrend - 4000 : null;
  return { day, baseTrend, risk };
});

export type EscrowStatus = "Net-14 Locked" | "Net-30 Escrow" | "Release Pending" | "Posted";

export type EscrowRow = {
  id: string;
  merchant: string;
  business: string;
  status: EscrowStatus;
  value: number;
  termDays: number;
  daysIn: number;
};

export const escrowRows: EscrowRow[] = [
  { id: "e-1", merchant: "Ahmad bin Yusof",   business: "Restoran Selera Kampung",  status: "Net-14 Locked",   value: 1000,   termDays: 14, daysIn: 8  },
  { id: "e-2", merchant: "Siti Norhaliza",     business: "Mart Wangsa",              status: "Net-14 Locked",   value: 2400,   termDays: 14, daysIn: 11 },
  { id: "e-3", merchant: "Tan Mei Ling",       business: "Café Hang Tuah",           status: "Release Pending", value: 1820,   termDays: 14, daysIn: 12 },
  { id: "e-4", merchant: "Mohd Faisal",        business: "Toko Buah Pasar Borong",   status: "Net-30 Escrow",   value: 3200,   termDays: 30, daysIn: 2  },
  { id: "e-5", merchant: "Rajesh Kumar",       business: "Kedai Runcit Sentral",     status: "Posted",          value: 540,    termDays: 30, daysIn: 30 },
  { id: "e-6", merchant: "Nurul Wholesale",    business: "Pasar Tani Distribution",  status: "Net-30 Escrow",   value: 86400,  termDays: 30, daysIn: 14 },
  { id: "e-7", merchant: "Petron Mart KL",     business: "Petron Convenience Group", status: "Net-14 Locked",   value: 142800, termDays: 14, daysIn: 5  },
];

export function formatRm(value: number, opts?: { decimals?: 0 | 2 }) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(value).replace("MYR", "RM");
}

export type ToolMeta = {
  /** Tool slot id (t1..t5). Per-scenario tools fill 0..n-1. */
  phase: "t1" | "t2" | "t3" | "t4" | "t5";
  agent: "wholesaler" | "merchant";
  name: string;
  description: string;
  output: string;
  scenarioTag: string;
  iconKey:
    | "search"
    | "calculator"
    | "send"
    | "brain"
    | "shield-check"
    | "trending-up"
    | "wallet"
    | "lock"
    | "receipt";
  engine: string;
  reasoning?: string;
};

export const swarmToolsByScenario: Record<SwarmScenario, ToolMeta[]> = {
  A: [
    {
      phase: "t1",
      agent: "wholesaler",
      name: "scan_escrow_ledger",
      description: "Query Supabase for LOCKED escrows from healthy MSMEs.",
      output: "Found 1 match · ESC-7142 · Ahmad bin Yusof · RM 1,000 · NET-14",
      scenarioTag: "scenario A",
      iconKey: "search",
      engine: "supabase.query",
    },
    {
      phase: "t2",
      agent: "wholesaler",
      name: "calculate_discount_offer",
      description: "Compute minimum viable discount to entice early release.",
      output: "Optimal: 2.0% · RM 20 · covers RM 800 shortfall + RM 180 buffer",
      scenarioTag: "scenario A",
      iconKey: "calculator",
      engine: "deterministic.solver",
    },
    {
      phase: "t3",
      agent: "wholesaler",
      name: "transmit_offer_payload",
      description: "Route structured JSON offer to Merchant AI.",
      output: "→ merchant:ahmad-yusof · {pct: 2.0, amount_rm: 20, expires: 2m}",
      scenarioTag: "scenario A · handoff",
      iconKey: "send",
      engine: "edge.router",
    },
    {
      phase: "t4",
      agent: "merchant",
      name: "evaluate_arbitrage_logic",
      description: "Compare offered discount against held GO+ yield.",
      output: "Net gain RM 18.50 · ACCEPT recommended",
      scenarioTag: "scenario A",
      iconKey: "brain",
      engine: "openai/gpt-4o",
      reasoning:
        "Wholesaler offers 2.0% (RM 20) for early release. Holding 14 days at 4% APY ≈ RM 1.50. Discount nets +RM 18.50 vs status quo. Recommendation: ACCEPT.",
    },
    {
      phase: "t5",
      agent: "merchant",
      name: "execute_early_settlement",
      description: "Trigger Supabase parametric release; double-entry credits.",
      output: "ledger 0xa9f3…b21c · wholesaler +RM 980 · GO+ wallet +RM 20",
      scenarioTag: "scenario A",
      iconKey: "shield-check",
      engine: "supabase.tx",
    },
  ],
  B: [
    {
      phase: "t1",
      agent: "merchant",
      name: "predict_demand_and_shortfall",
      description: "Analyze historical QR sales to forecast stockout.",
      output: "Stockout in 3 days · order RM 1,000 · cash short RM 500",
      scenarioTag: "scenario B",
      iconKey: "trending-up",
      engine: "openai/gpt-4o",
    },
    {
      phase: "t2",
      agent: "merchant",
      name: "underwrite_micro_loan",
      description: "Score 30d QR velocity to approve fractional BNPL.",
      output: "30d velocity RM 18,400 · BNPL approved RM 500 · 0% via sweep",
      scenarioTag: "scenario B",
      iconKey: "wallet",
      engine: "deterministic.scorer",
    },
    {
      phase: "t3",
      agent: "merchant",
      name: "lock_mixed_fund_escrow",
      description: "Combine RM 500 cash + RM 500 BNPL into single LOCKED row.",
      output: "ESC-7142 · LOCKED · NET-14 · merchant:ahmad-yusof",
      scenarioTag: "scenario B · handoff",
      iconKey: "lock",
      engine: "supabase.tx",
    },
    {
      phase: "t4",
      agent: "wholesaler",
      name: "verify_escrow_status",
      description: "Realtime listener confirms RM 1,000 hits the ledger.",
      output: "Match · RM 1,000 · status: SECURED — READY FOR DISPATCH",
      scenarioTag: "scenario B",
      iconKey: "shield-check",
      engine: "supabase.realtime",
    },
  ],
};

export const agentBanners = {
  wholesaler: { label: "Wholesaler Agent", role: "The Liquidity Broker" },
  merchant:   { label: "Merchant Agent",   role: "The Agentic CFO"      },
} as const;

export type ToolCall = {
  id: string;
  timestamp: string;
  name: string;
  detail: string;
  /** Phase position (1..5) at which this entry appears. Index into the active scenario's tool list. */
  appearAtIndex: number;
  scenario: SwarmScenario;
};

export const toolCallsByScenario: Record<SwarmScenario, ToolCall[]> = {
  A: [
    { id: "A-1", timestamp: "15:42:10", name: "scan_escrow_ledger",       detail: "1 match · ESC-7142 · RM 1,000",         appearAtIndex: 0, scenario: "A" },
    { id: "A-2", timestamp: "15:42:12", name: "calculate_discount_offer", detail: "2.0% · RM 20 nets RM 980",              appearAtIndex: 1, scenario: "A" },
    { id: "A-3", timestamp: "15:42:14", name: "transmit_offer_payload",   detail: "→ merchant:ahmad-yusof",                appearAtIndex: 2, scenario: "A" },
    { id: "A-4", timestamp: "15:42:18", name: "evaluate_arbitrage_logic", detail: "+RM 18.50 net · ACCEPT",                appearAtIndex: 3, scenario: "A" },
    { id: "A-5", timestamp: "15:42:20", name: "execute_early_settlement", detail: "wholesaler +RM 980 · merchant +RM 20",  appearAtIndex: 4, scenario: "A" },
  ],
  B: [
    { id: "B-1", timestamp: "15:30:02", name: "predict_demand_and_shortfall", detail: "stockout in 3d · short RM 500",     appearAtIndex: 0, scenario: "B" },
    { id: "B-2", timestamp: "15:30:04", name: "underwrite_micro_loan",        detail: "BNPL RM 500 · approved",            appearAtIndex: 1, scenario: "B" },
    { id: "B-3", timestamp: "15:30:08", name: "lock_mixed_fund_escrow",       detail: "LOCKED · ESC-7142 · NET-14",        appearAtIndex: 2, scenario: "B" },
    { id: "B-4", timestamp: "15:30:09", name: "verify_escrow_status",         detail: "verified · ready for dispatch",     appearAtIndex: 3, scenario: "B" },
  ],
};

export const ledgerHash = "0xa9f3b8e21c";

export const yieldOffer = {
  base: 1.8,
  default: 2.4,
  max: 4.0,
  step: 0.1,
  baseAmount: 2450,
};

export type KpiV2 = {
  caption: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  spark: number[];
  livePulse?: boolean;
};

const sparkUp   = [40, 45, 42, 48, 52, 49, 55, 58, 56, 62, 64, 68];
const sparkFlat = [50, 52, 49, 51, 50, 48, 51, 49, 50, 51, 50, 52];

export const kpis: KpiV2[] = [
  { caption: "ESCROW LOCKED",       value: "RM 145,000", delta: "+ live ledger",       trend: "up", spark: sparkUp,   livePulse: true },
  { caption: "LIQUIDITY AVAILABLE", value: "RM 37,400",  delta: "RM 800 short today",  trend: "down", spark: sparkFlat },
  { caption: "ACTIVE MSMES",        value: "128",        delta: "+ healthy cohort",    trend: "up", spark: sparkUp },
  { caption: "GO+ YIELD 30D",       value: "RM 1,860",   delta: "daily accrual",       trend: "up", spark: sparkUp },
];

/** Banner copy for the new ShortfallAlert. State-driven, not mode-driven. */
export type ShortfallState = "open" | "in-flight" | "resolved";

export const shortfallCopy: Record<ShortfallState, { title: string; body: string; cta: string | null }> = {
  open: {
    title: "Cash Shortfall Detected",
    body: "RM 800 needed today to cover supplier payables. Generate liquidity from locked escrows.",
    cta: "Generate Instant Liquidity",
  },
  "in-flight": {
    title: "Liquidity Sequence Running",
    body: "Wholesaler agent is negotiating with healthy merchants — awaiting acceptance.",
    cta: null,
  },
  resolved: {
    title: "Liquidity Restored",
    body: "RM 980 received from Ahmad bin Yusof · RM 180 surplus over the RM 800 shortfall.",
    cta: null,
  },
};

export const merchantCashFlow: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const sales = 600 + Math.sin(i / 5) * 80 + i * 6;
  const dip = i === 14 ? 1 : 0;
  const baseTrend = Math.round(sales - dip * 100);
  const risk = dip ? baseTrend - 60 : null;
  return { day, baseTrend, risk };
});
