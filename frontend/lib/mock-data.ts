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

export type ToolCall = {
  id: string;
  timestamp: string;
  name: string;
  detail: string;
  /** Phase this entry should appear at */
  appearAt: "ingesting" | "optimizing" | "executing" | "settled";
};

export const toolCalls: ToolCall[] = [
  { id: "t-1", timestamp: "15:42:10", name: "escrow.lock",      detail: "RM 2,450 committed to TNG GO+ escrow",   appearAt: "ingesting"  },
  { id: "t-2", timestamp: "15:42:14", name: "bnpl.drawdown",    detail: "RM 500 fractional shortfall funded",      appearAt: "optimizing" },
  { id: "t-3", timestamp: "15:42:21", name: "go_plus.yield",    detail: "+RM 0.34 streaming · 1.8% APY",           appearAt: "optimizing" },
  { id: "t-4", timestamp: "15:43:02", name: "discount.offer",   detail: "2.0% early-release tendered to wholesaler", appearAt: "executing"  },
  { id: "t-5", timestamp: "15:43:08", name: "escrow.release",   detail: "Settlement posted · ledger 0xa9f3…b21c",   appearAt: "settled"    },
];

export type AgentMeta = {
  slot: "ingest" | "optimize" | "execute";
  title: string;
  subtitle: string;
  /** displayed in the active state */
  metric: string;
};

export const agents: AgentMeta[] = [
  { slot: "ingest",   title: "Data Ingest",     subtitle: "ACME_CORP_API",          metric: "stream live"     },
  { slot: "optimize", title: "Yield Optimizer", subtitle: "DELTA: +0.6%",           metric: "1.8% → 2.4%"     },
  { slot: "execute",  title: "Execution",       subtitle: "READY TO COMMIT",        metric: "RM 2,401 net"    },
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
