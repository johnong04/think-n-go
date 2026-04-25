from pydantic import BaseModel


class MsmeDemandPressureResult(BaseModel):
    demand_pressure_score: float
    demand_pressure_label: str
    confidence_score: float


class MsmeCalculationTrace(BaseModel):
    forecast_ratio_vs_baseline: float
    recent_momentum_multiplier: float
    projected_3_day_inflow_rm: float
    normal_3_day_baseline_rm: float
    typical_large_outflow_rm: float
    typical_cycle_days: float
    last_large_outflow_date: str | None
    days_since_last_large_outflow: int
    current_balance_rm: float
    balance_coverage_ratio: float
    estimated_cash_gap_rm: float
    suggested_bnpl_topup_rm: float
    expected_5pct_daily_repayment_rm: float
    estimated_repayment_days: int


class MsmeReasonCode(BaseModel):
    code: str
    severity: str
    message: str


class MsmeDemandPressureResponse(BaseModel):
    as_of_date: str
    data_assumption: str
    result: MsmeDemandPressureResult
    calculation_trace: MsmeCalculationTrace
    reason_codes: list[MsmeReasonCode]
    caveats: list[str]


class MsmeInsightRequest(BaseModel):
    llm_summary: MsmeDemandPressureResponse


class MsmeInsightNumber(BaseModel):
    label: str
    value: str


class MsmeInsightResponse(BaseModel):
    headline: str
    summary: str
    main_numbers: list[MsmeInsightNumber]
    plain_reasons: list[str]
    repayment_text: str | None = None
    caveat: str
    tone: str
    source_summary: MsmeDemandPressureResponse
