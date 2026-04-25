export type Mode = "merchant" | "wholesaler";

export type Kpi = {
  caption: string;
  value: string;
  trend: string;
  livePulse?: boolean;
};

export const kpis: Kpi[] = [
  { caption: "ESCROW LOCKED", value: "RM 145,000", trend: "+ live ledger", livePulse: true },
  { caption: "LIQUIDITY AVAILABLE", value: "RM 37,400", trend: "instant release" },
  { caption: "ACTIVE MSMES", value: "128", trend: "+ healthy cohort" },
  { caption: "GO+ YIELD 30D", value: "RM 1,860", trend: "daily accrual" },
];

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
