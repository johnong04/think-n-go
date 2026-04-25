export const merchant = {
  name: "Ahmad bin Yusof",
  shortName: "Ahmad",
  business: "Restoran Selera Kampung",
  walletBalanceRm: 720,
  qrVelocity30dRm: 18400,
  healthScore: 82,
  phone: "+60 12-345 6789",
};

export const wholesaler = {
  name: "Hartono Manufacturing",
  rep: "Lim Wei Jian",
  rating: "AAA",
  walletBalanceRm: 184500,
  outstandingReceivablesRm: 241000,
};

export const stockoutAlert = {
  product: "Cooking oil 5L (carton ×6)",
  forecastDays: 3,
  recommendedQty: 2,
  unitPriceRm: 500,
  totalRm: 1000,
  shortfallRm: 500,
  trendingDelta: "+38% trailing 7-day",
};

export type EscrowDraft = {
  escrowId: string;
  invoiceNum?: string;
  invoiceRef?: string | null;
  wholesalerName: string;
  totalRm: number;
  ownFundsRm: number;
  bnplRm: number;
  termDays: number;
  dailyYieldRm: number;
  repaymentSweepPct: number;
  dispatchEta: string;
  description?: string | null;
  receiverName?: string | null;
};

export const escrowDraft: EscrowDraft = {
  escrowId: "ESC-7142",
  invoiceNum: "INV-TNG-DEMO",
  invoiceRef: "QR-DEMO-7142",
  wholesalerName: "Hartono Manufacturing",
  totalRm: 1000,
  ownFundsRm: 500,
  bnplRm: 500,
  termDays: 14,
  dailyYieldRm: 0.34,
  repaymentSweepPct: 5,
  dispatchEta: "Same-day dispatch",
  description: "Pre-contract commercial invoice",
  receiverName: "Ahmad bin Yusof",
};

export type ClientRow = {
  id: string;
  name: string;
  business: string;
  escrowRm: number;
  termDays: number;
  daysIn: number;
  health: "AAA" | "AA" | "A";
};

export const wholesalerClients: ClientRow[] = [
  { id: "c-1", name: "Ahmad bin Yusof",     business: "Restoran Selera Kampung", escrowRm: 1000,  termDays: 14, daysIn: 8,  health: "AAA" },
  { id: "c-2", name: "Siti Norhaliza",       business: "Mart Wangsa",             escrowRm: 2400,  termDays: 14, daysIn: 11, health: "AA"  },
  { id: "c-3", name: "Rajesh Kumar",         business: "Kedai Runcit Sentral",    escrowRm: 540,   termDays: 30, daysIn: 4,  health: "AAA" },
  { id: "c-4", name: "Tan Mei Ling",         business: "Café Hang Tuah",          escrowRm: 1820,  termDays: 14, daysIn: 12, health: "A"   },
  { id: "c-5", name: "Mohd Faisal",          business: "Toko Buah Pasar Borong",  escrowRm: 3200,  termDays: 30, daysIn: 2,  health: "AA"  },
];

export const offerPayload = {
  escrowId: "ESC-7142",
  defaultDiscountPct: 2.0,
  minDiscountPct: 1.0,
  maxDiscountPct: 5.0,
  stepDiscountPct: 0.1,
};

export function fmtRm(value: number, decimals: 0 | 2 = 0) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace("MYR", "RM");
}
