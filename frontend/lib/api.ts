export type MsmeReasonCode = {
  code: string;
  severity: string;
  message: string;
};

export type MsmeDemandPressureSummary = {
  as_of_date: string;
  data_assumption: string;
  result: {
    demand_pressure_score: number;
    demand_pressure_label: string;
    confidence_score: number;
  };
  calculation_trace: {
    forecast_ratio_vs_baseline: number;
    recent_momentum_multiplier: number;
    projected_3_day_inflow_rm: number;
    normal_3_day_baseline_rm: number;
    typical_large_outflow_rm: number;
    typical_cycle_days: number;
    last_large_outflow_date: string | null;
    days_since_last_large_outflow: number;
    current_balance_rm: number;
    balance_coverage_ratio: number;
    estimated_cash_gap_rm: number;
    suggested_bnpl_topup_rm: number;
    expected_5pct_daily_repayment_rm: number;
    estimated_repayment_days: number;
  };
  reason_codes: MsmeReasonCode[];
  caveats: string[];
};

export type MsmeInsightResponse = {
  headline: string;
  summary: string;
  main_numbers: Array<{ label: string; value: string }>;
  plain_reasons: string[];
  repayment_text: string | null;
  caveat: string;
  tone: string;
  source_summary: MsmeDemandPressureSummary;
};

export type InvoiceItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type InvoiceExtractionResponse = {
  items: InvoiceItem[];
};

export type InvoiceParty = {
  name: string;
  phone: string | null;
  location: string | null;
  tax_id: string | null;
};

export type InvoiceTerms = {
  net_days: string;
  due_date: string | null;
  payment_method: string;
  delivery_terms: string | null;
  late_fee_note: string | null;
};

export type InvoiceDraft = {
  invoice_num: string;
  invoice_ref: string | null;
  issue_date: string;
  currency: string;
  supplier: InvoiceParty;
  receiver: InvoiceParty;
  items: InvoiceItem[];
  subtotal: number;
  tax_rm: number;
  shipping_rm: number;
  adjustment_rm: number;
  total: number;
  principal_amount: number;
  terms: InvoiceTerms;
  description: string | null;
  notes: string | null;
  status: "draft" | "ready_for_review";
};

export type InvoiceDraftResponse = {
  draft: InvoiceDraft;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

class ApiError extends Error {
  status?: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload?.detail) detail = payload.detail;
    } catch {
      // Fall back to status text when the backend doesn't return JSON.
    }
    const error = new ApiError(detail);
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function getMockDemandPressure(params?: {
  current_balance_rm?: number;
  as_of_date?: string;
  forecast_days?: number;
  state?: string;
}) {
  const search = new URLSearchParams();
  if (params?.current_balance_rm !== undefined) {
    search.set("current_balance_rm", String(params.current_balance_rm));
  }
  if (params?.as_of_date) search.set("as_of_date", params.as_of_date);
  if (params?.forecast_days !== undefined) {
    search.set("forecast_days", String(params.forecast_days));
  }
  if (params?.state) search.set("state", params.state);

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<MsmeDemandPressureSummary>(`/msme/demand-pressure/mock${suffix}`, {
    method: "GET",
  });
}

export async function getDemandPressureInsight(llmSummary: MsmeDemandPressureSummary) {
  return apiFetch<MsmeInsightResponse>("/msme/demand-pressure/insight", {
    method: "POST",
    body: JSON.stringify({ llm_summary: llmSummary }),
  });
}

export async function extractInvoiceItems(text: string) {
  return apiFetch<InvoiceExtractionResponse>("/invoice/extract-items", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function createInvoiceDraft(
  prompt: string,
  context?: {
    default_supplier_name?: string;
    default_receiver_name?: string;
    currency?: string;
  }
) {
  return apiFetch<InvoiceDraftResponse>("/invoice/draft", {
    method: "POST",
    body: JSON.stringify({ prompt, context }),
  });
}

export async function reviseInvoiceDraft(draft: InvoiceDraft, instruction: string) {
  return apiFetch<InvoiceDraftResponse>("/invoice/revise", {
    method: "POST",
    body: JSON.stringify({ draft, instruction }),
  });
}

export { ApiError };

// ─── Demo / Dashboard ────────────────────────────────────────────────────
export type DashboardKpisResponse = {
  escrow_locked_rm: string;
  liquidity_available_rm: string;
  active_msmes: number;
  go_plus_yield_30d_rm: string;
};

export type DemoResetResponse = {
  ok: boolean;
  wholesaler: string;
  merchants: number;
  contracts: number;
};

export async function postDemoReset() {
  return apiFetch<DemoResetResponse>("/demo/reset", { method: "POST" });
}

export async function getDashboardKpis() {
  return apiFetch<DashboardKpisResponse>("/dashboard/kpis", { method: "GET" });
}

// ─── Contracts (live escrow table) ───────────────────────────────────────
export type ContractRow = {
  id: string;
  status: string;
  principal_amount: string;
  net_days: string | null;
  business_name: string | null;
  receiver_name: string | null;
  date_created: string;
};

export async function getActiveContracts() {
  return apiFetch<ContractRow[]>("/contracts/", { method: "GET" });
}

// ─── Agent endpoints ─────────────────────────────────────────────────────
export type OptimizeDiscountResponse = {
  suggested_discount_rate: string;
  target_contracts: string[];
  message: string;
  reasoning_text: string;
};

export async function postOptimizeDiscount(input: {
  supplier_id: string;
  target_cash: number;
}) {
  return apiFetch<OptimizeDiscountResponse>("/agent/supplier/optimize-discount", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AuditArbitrageResponse = {
  yield_calculation: string;
  discount_capture: string;
  decision_engine: string;
  reasoning_text: string;
};

export async function postAuditArbitrage(input: {
  contract_id: string;
  discount_rate: number;
}) {
  return apiFetch<AuditArbitrageResponse>("/agent/merchant/audit-arbitrage", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UnderwriteResponse = {
  contract_id: string;
  status: string;
  principal: string;
  funding_source: string;
  message: string;
  reasoning_text: string;
};

export async function postRequestUnderwriting(input: {
  merchant_id: string;
  supplier_id: string;
  principal_amount: number;
}) {
  return apiFetch<UnderwriteResponse>("/agent/merchant/request-underwriting", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type SettleEarlyResponse = {
  contract_id: string;
  status: string;
  payout_to_supplier_rm: string;
  rebate_to_merchant_rm: string;
  ledger_hash: string;
  reasoning_text: string;
};

export async function postTriggerSettlement(input: {
  contract_id: string;
  discount_rate: number;
}) {
  return apiFetch<SettleEarlyResponse>("/agent/merchant/trigger-settlement", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type VelocityAnalysisResponse = {
  merchant_id: string;
  predicted_shortfall_hours: number;
  message: string;
  reasoning_text: string;
};

export async function getAnalyzeVelocity(merchantId: string) {
  return apiFetch<VelocityAnalysisResponse>(
    `/agent/merchant/analyze-velocity/${merchantId}`,
    { method: "GET" }
  );
}

// ─── Demo constants (the stable IDs from seed_demo.py) ───────────────────
export const DEMO_IDS = {
  wholesaler: "00000000-0000-4000-8000-000000000001",
  merchants: {
    ahmad: "00000000-0000-4000-8000-000000000010",
    siti: "00000000-0000-4000-8000-000000000011",
    tan: "00000000-0000-4000-8000-000000000012",
    faisal: "00000000-0000-4000-8000-000000000013",
    rajesh: "00000000-0000-4000-8000-000000000014",
  },
} as const;
