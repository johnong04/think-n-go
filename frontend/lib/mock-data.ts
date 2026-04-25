export type Mode = "merchant" | "wholesaler";

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

export const arbitrageOffer = {
  merchantCopy: "A wholesaler offered a 2.4% discount to release your escrow 14 days early.",
  wholesalerCopy: "The agentic swarm has identified a 2.4% yield differential on the Acme Corp escrow if released 14 days early.",
};

export function formatRm(value: number, opts?: { decimals?: 0 | 2 }) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(value).replace("MYR", "RM");
}

export type ToolMeta = {
  /** phase identifier from swarm-machine */
  phase: "t1" | "t2" | "t3" | "t4" | "t5";
  /** which agent owns this tool */
  agent: "wholesaler" | "merchant";
  /** snake_case tool function name (mono) */
  name: string;
  /** one-line action description */
  description: string;
  /** mono-styled output preview shown when active or done */
  output: string;
  /** scenario tag chip text */
  scenarioTag: string;
  /** lucide-react icon name (the consumer imports & maps these) */
  iconKey: "search" | "calculator" | "send" | "brain" | "shield-check";
  /** Source/engine label shown in the "engine" pill dangling below the tool node (n8n-style). */
  engine: string;
  /** if present, a reasoning bubble pops up while this tool is active */
  reasoning?: string;
};

export const swarmTools: ToolMeta[] = [
  {
    phase: "t1",
    agent: "wholesaler",
    name: "scan_escrow_ledger",
    description: "Query Supabase for LOCKED escrows from healthy MSMEs.",
    output: "Found 1 match · ESC-7142 · RM 2,450 · NET-14",
    scenarioTag: "scenario A",
    iconKey: "search",
    engine: "supabase.query",
  },
  {
    phase: "t2",
    agent: "wholesaler",
    name: "calculate_discount_offer",
    description: "Compute minimum viable discount % for cash shortfall.",
    output: "Optimal: 2.0% · RM 49 vs 14d carry",
    scenarioTag: "scenario A",
    iconKey: "calculator",
    engine: "deterministic.solver",
  },
  {
    phase: "t3",
    agent: "wholesaler",
    name: "transmit_offer_payload",
    description: "Route structured JSON offer to Merchant AI.",
    output: "→ merchant:ahmad-yusof · {pct: 2.0, expires: 2m}",
    scenarioTag: "scenario A · handoff",
    iconKey: "send",
    engine: "edge.router",
  },
  {
    phase: "t4",
    agent: "merchant",
    name: "evaluate_arbitrage_logic",
    description: "Compare offered discount against held GO+ yield.",
    output: "Net gain RM 46.64 · ACCEPT recommended",
    scenarioTag: "scenario A",
    iconKey: "brain",
    engine: "openai/gpt-4o",
    reasoning:
      "Wholesaler offers 2.0% (RM 49.00) for early release. Holding 14 days at 1.8% APY ≈ RM 2.36. Discount nets +RM 46.64 vs status quo. Recommendation: ACCEPT.",
  },
  {
    phase: "t5",
    agent: "merchant",
    name: "execute_early_settlement",
    description: "Trigger Supabase parametric release; double-entry credits.",
    output: "ledger 0xa9f3…b21c · status: SETTLED",
    scenarioTag: "scenario A",
    iconKey: "shield-check",
    engine: "supabase.tx",
  },
];

export const agentBanners = {
  wholesaler: {
    label: "Wholesaler Agent",
    role: "The Liquidity Broker",
  },
  merchant: {
    label: "Merchant Agent",
    role: "The Agentic CFO",
  },
} as const;

export type ToolCall = {
  id: string;
  timestamp: string;
  name: string;
  detail: string;
  /** Phase this entry should appear at — uses the new t1..t5 + settled */
  appearAt: "t1" | "t2" | "t3" | "t4" | "t5" | "settled";
};

export const toolCalls: ToolCall[] = [
  { id: "log-1", timestamp: "15:42:10", name: "scan_escrow_ledger",       detail: "1 match · ESC-7142",                     appearAt: "t1"      },
  { id: "log-2", timestamp: "15:42:12", name: "calculate_discount_offer", detail: "2.0% optimal vs 14d hold",               appearAt: "t2"      },
  { id: "log-3", timestamp: "15:42:14", name: "transmit_offer_payload",   detail: "→ merchant:ahmad-yusof",                 appearAt: "t3"      },
  { id: "log-4", timestamp: "15:42:16", name: "evaluate_arbitrage_logic", detail: "Net +RM 46.64 · accept",                 appearAt: "t4"      },
  { id: "log-5", timestamp: "15:42:18", name: "execute_early_settlement", detail: "ledger 0xa9f3…b21c · settled",           appearAt: "t5"      },
  { id: "log-6", timestamp: "15:42:18", name: "credit.double_entry",      detail: "wholesaler +RM 2,401 / merchant +RM 49", appearAt: "settled" },
];

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
const sparkDown = [70, 68, 72, 65, 67, 64, 60, 62, 58, 56, 54, 51];

export const kpisMerchant: KpiV2[] = [
  { caption: "WALLET BALANCE",   value: "RM 720",   delta: "+RM 12 today",  trend: "up",   spark: sparkUp,   livePulse: true },
  { caption: "OUTSTANDING",      value: "RM 4,820", delta: "5 escrows",     trend: "up",   spark: sparkFlat },
  { caption: "BNPL DRAWN",       value: "RM 500",   delta: "0% if swept",   trend: "down", spark: sparkDown },
  { caption: "GO+ YIELD EARNED", value: "RM 38",    delta: "+RM 0.34/day",  trend: "up",   spark: sparkUp },
];

export const kpisWholesaler: KpiV2[] = [
  { caption: "ESCROW LOCKED",       value: "RM 145,000", delta: "+ live ledger",    trend: "up", spark: sparkUp,   livePulse: true },
  { caption: "LIQUIDITY AVAILABLE", value: "RM 37,400",  delta: "instant release",  trend: "up", spark: sparkFlat },
  { caption: "ACTIVE MSMES",        value: "128",        delta: "+ healthy",        trend: "up", spark: sparkUp },
  { caption: "GO+ YIELD 30D",       value: "RM 1,860",   delta: "daily accrual",    trend: "up", spark: sparkUp },
];

export function kpisForMode(mode: Mode): KpiV2[] {
  return mode === "merchant" ? kpisMerchant : kpisWholesaler;
}

export type BannerCopy = {
  title: string;
  body: string;
  cta: string;
};

export const bannerCopy: Record<"merchant" | "wholesaler", Record<"idle" | "settled", BannerCopy>> = {
  merchant: {
    idle:    { title: "Repayment on Track",  body: "BNPL line repaying via 5% QR sweep — RM 175 due in 7 days.", cta: "View schedule" },
    settled: { title: "Settlement Received", body: "RM 980 credited from early-release acceptance.",              cta: "View ledger" },
  },
  wholesaler: {
    idle:    { title: "Arbitrage Opportunity Detected", body: "2.4% yield differential — release 14 days early.",  cta: "Review & Execute" },
    settled: { title: "Liquidity Released",  body: "RM 2,401 credited to your account.",                          cta: "View receipt" },
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
