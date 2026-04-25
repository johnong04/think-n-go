from __future__ import annotations

import csv
import math
import statistics
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any


DEFAULT_FORECAST_DAYS = 7
DEFAULT_STATE = "selangor"
HOLIDAY_API_URL = "https://sabah-holiday.dydxsoft.my/api/{state}/{year}.json"
MOCK_TRANSACTIONS_PATH = (
    Path(__file__).resolve().parents[2] / "mock_output" / "mock_wallet_transactions.csv"
)

FALLBACK_HOLIDAYS = {
    date(2026, 2, 17): "Chinese New Year",
    date(2026, 2, 18): "Chinese New Year Holiday",
    date(2026, 3, 21): "Hari Raya Aidilfitri",
    date(2026, 3, 22): "Hari Raya Aidilfitri Holiday",
    date(2026, 5, 1): "Labour Day",
    date(2026, 5, 27): "Hari Raya Haji",
    date(2026, 8, 31): "National Day",
    date(2026, 9, 16): "Malaysia Day",
    date(2026, 11, 8): "Deepavali",
    date(2026, 12, 25): "Christmas Day",
}


class MsmeDemandPressureError(RuntimeError):
    pass


@dataclass(frozen=True)
class Txn:
    datetime: datetime
    amount_rm: float


@dataclass(frozen=True)
class DailyActivity:
    date: date
    weekday: str
    money_in_rm: float
    in_txn_count: int
    money_out_rm: float
    out_txn_count: int
    net_flow_rm: float
    large_outflow_rm: float
    has_large_outflow: bool


@dataclass(frozen=True)
class ForecastRow:
    date: date
    weekday: str
    weekday_avg_inflow_rm: float
    momentum_multiplier: float
    calendar_multiplier: float
    calendar_reasons: str
    forecast_inflow_rm: float


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def round_money(x: float) -> float:
    return round(x + 1e-9, 2)


def round_up_to_nearest(x: float, step: int = 50) -> float:
    if x <= 0:
        return 0.0
    return float(math.ceil(x / step) * step)


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return sorted_values[0]
    k = (len(sorted_values) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_values[int(k)]
    return sorted_values[f] * (c - k) + sorted_values[c] * (k - f)


def parse_holiday_date(raw_date: object, year: int) -> date | None:
    raw = str(raw_date).strip()
    if not raw:
        return None

    try:
        parsed = datetime.fromisoformat(raw[:10]).date()
        if parsed.year == year:
            return parsed
    except ValueError:
        pass

    for fmt in ("%b %d", "%B %d"):
        try:
            parsed_month_day = datetime.strptime(raw, fmt)
            return date(year, parsed_month_day.month, parsed_month_day.day)
        except ValueError:
            pass

    return None


def load_transactions_csv(path: Path, as_of: date) -> list[Txn]:
    if not path.exists():
        raise MsmeDemandPressureError(f"Transaction CSV not found: {path}")

    txns: list[Txn] = []
    try:
        with path.open("r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames is None:
                raise MsmeDemandPressureError("Transaction CSV is empty.")

            required = {"datetime", "amount_rm"}
            missing = required - set(reader.fieldnames)
            if missing:
                raise MsmeDemandPressureError(
                    f"Transaction CSV is missing required column(s): {', '.join(sorted(missing))}"
                )

            for row_number, row in enumerate(reader, start=2):
                try:
                    txn_datetime = datetime.fromisoformat(str(row["datetime"]))
                    amount_rm = float(row["amount_rm"])
                except (TypeError, ValueError) as exc:
                    raise MsmeDemandPressureError(
                        f"Invalid transaction row {row_number}; expected datetime and numeric amount_rm."
                    ) from exc

                if txn_datetime.date() <= as_of:
                    txns.append(Txn(datetime=txn_datetime, amount_rm=amount_rm))
    except OSError as exc:
        raise MsmeDemandPressureError(f"Unable to read transaction CSV: {exc}") from exc

    if not txns:
        raise MsmeDemandPressureError(
            f"No transaction rows found on or before as_of_date {as_of.isoformat()}."
        )

    txns.sort(key=lambda x: x.datetime)
    return txns


def load_malaysia_holidays(year: int, state: str) -> dict[date, str]:
    url = HOLIDAY_API_URL.format(state=state, year=year)
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))

        if isinstance(payload, dict):
            if "data" in payload:
                items = payload["data"]
            elif "holidays" in payload:
                items = payload["holidays"]
            else:
                items = []
        elif isinstance(payload, list):
            items = payload
        else:
            items = []

        holidays: dict[date, str] = {}
        for item in items:
            if not isinstance(item, dict):
                continue

            raw_date = item.get("date") or item.get("holiday_date") or item.get("start")
            name = (
                item.get("name")
                or item.get("holiday_name")
                or item.get("holiday")
                or item.get("summary")
                or "Public Holiday"
            )
            parsed = parse_holiday_date(raw_date, year)
            if parsed:
                holidays[parsed] = str(name)

        if holidays:
            return holidays
    except Exception:
        pass

    return {d: name for d, name in FALLBACK_HOLIDAYS.items() if d.year == year}


def calendar_multiplier(d: date, holidays: dict[date, str]) -> tuple[float, list[str]]:
    multiplier = 1.0
    reasons: list[str] = []

    if d.day >= 25 or d.day <= 1:
        multiplier *= 1.08
        reasons.append("payday window")

    if d in holidays:
        multiplier *= 0.95
        reasons.append(f"holiday: {holidays[d]}")
    else:
        upcoming = [(hdate - d).days for hdate in holidays if 0 < (hdate - d).days <= 7]
        if upcoming:
            days_to = min(upcoming)
            leadup = 1.00 + (8 - days_to) * 0.025
            leadup = clamp(leadup, 1.025, 1.175)
            multiplier *= leadup
            reasons.append(f"{days_to}d before public holiday")

    return round(multiplier, 4), reasons


def aggregate_daily(
    txns: list[Txn],
    start: date,
    end: date,
    large_outflow_threshold: float,
) -> list[DailyActivity]:
    by_day: dict[date, list[Txn]] = {d: [] for d in daterange(start, end)}
    for txn in txns:
        by_day.setdefault(txn.datetime.date(), []).append(txn)

    rows: list[DailyActivity] = []
    for d in daterange(start, end):
        day_txns = by_day.get(d, [])
        money_in = sum(t.amount_rm for t in day_txns if t.amount_rm > 0)
        out_amounts = [abs(t.amount_rm) for t in day_txns if t.amount_rm < 0]
        money_out = sum(out_amounts)
        large_outflow = sum(a for a in out_amounts if a >= large_outflow_threshold)

        rows.append(
            DailyActivity(
                date=d,
                weekday=d.strftime("%A"),
                money_in_rm=round_money(money_in),
                in_txn_count=sum(1 for t in day_txns if t.amount_rm > 0),
                money_out_rm=round_money(money_out),
                out_txn_count=sum(1 for t in day_txns if t.amount_rm < 0),
                net_flow_rm=round_money(money_in - money_out),
                large_outflow_rm=round_money(large_outflow),
                has_large_outflow=large_outflow > 0,
            )
        )

    return rows


def infer_large_outflow_threshold(txns: list[Txn]) -> float:
    out_amounts = [abs(t.amount_rm) for t in txns if t.amount_rm < 0]
    if not out_amounts:
        return 500.0
    return round_money(max(500.0, percentile(out_amounts, 0.90)))


def weekday_average_inflows(
    daily: list[DailyActivity],
    as_of: date,
) -> dict[int, float]:
    values_by_weekday: dict[int, list[float]] = {i: [] for i in range(7)}
    historical = [row for row in daily if row.date < as_of]
    if not historical:
        return {i: 0.0 for i in range(7)}

    for row in historical:
        values_by_weekday[row.date.weekday()].append(row.money_in_rm)

    overall = statistics.mean(row.money_in_rm for row in historical)
    return {
        wd: round_money(statistics.mean(values) if values else overall)
        for wd, values in values_by_weekday.items()
    }


def recent_momentum(daily: list[DailyActivity], as_of: date) -> float:
    last_7 = [r.money_in_rm for r in daily if as_of - timedelta(days=7) <= r.date < as_of]
    prev_21 = [
        r.money_in_rm
        for r in daily
        if as_of - timedelta(days=28) <= r.date < as_of - timedelta(days=7)
    ]

    if not last_7 or not prev_21 or statistics.mean(prev_21) == 0:
        return 1.0

    raw = statistics.mean(last_7) / statistics.mean(prev_21)
    return round(clamp(raw, 0.75, 1.35), 4)


def infer_large_outflow_pattern(
    daily: list[DailyActivity],
    as_of: date,
) -> dict[str, Any]:
    large_days = [r.date for r in daily if r.has_large_outflow]
    large_amounts = [r.large_outflow_rm for r in daily if r.has_large_outflow]

    if not large_days:
        return {
            "large_outflow_count": 0,
            "typical_large_outflow_rm": None,
            "typical_cycle_days": None,
            "last_large_outflow_date": None,
            "days_since_last_large_outflow": None,
            "gap_consistency_score": 0.0,
        }

    gaps = [(large_days[i] - large_days[i - 1]).days for i in range(1, len(large_days))]
    typical_cycle = statistics.median(gaps) if gaps else None

    if len(gaps) >= 2 and statistics.mean(gaps) > 0:
        cv = statistics.pstdev(gaps) / statistics.mean(gaps)
        consistency = clamp(1.0 - cv, 0.0, 1.0)
    else:
        consistency = 0.5 if gaps else 0.0

    return {
        "large_outflow_count": len(large_days),
        "typical_large_outflow_rm": round_money(statistics.median(large_amounts)),
        "typical_cycle_days": float(typical_cycle) if typical_cycle is not None else None,
        "last_large_outflow_date": large_days[-1].isoformat(),
        "days_since_last_large_outflow": (as_of - large_days[-1]).days,
        "gap_consistency_score": round(consistency, 4),
    }


def build_forecast(
    daily: list[DailyActivity],
    as_of: date,
    holidays: dict[date, str],
    days: int,
) -> tuple[list[ForecastRow], float]:
    weekday_avgs = weekday_average_inflows(daily, as_of)
    momentum = recent_momentum(daily, as_of)

    forecast: list[ForecastRow] = []
    for i in range(1, days + 1):
        d = as_of + timedelta(days=i)
        base = weekday_avgs[d.weekday()]
        cal_mult, reasons = calendar_multiplier(d, holidays)
        predicted = round_money(base * momentum * cal_mult)
        forecast.append(
            ForecastRow(
                date=d,
                weekday=d.strftime("%A"),
                weekday_avg_inflow_rm=round_money(base),
                momentum_multiplier=momentum,
                calendar_multiplier=cal_mult,
                calendar_reasons="; ".join(reasons) if reasons else "normal",
                forecast_inflow_rm=predicted,
            )
        )

    return forecast, momentum


def build_summary(
    daily: list[DailyActivity],
    forecast: list[ForecastRow],
    restock: dict[str, Any],
    current_balance_rm: float,
    as_of: date,
    momentum: float,
) -> dict[str, Any]:
    next3 = forecast[:3]
    projected_3_day_inflow = sum(r.forecast_inflow_rm for r in next3)
    normal_3_day_baseline = sum(r.weekday_avg_inflow_rm for r in next3)
    forecast_ratio = (
        projected_3_day_inflow / normal_3_day_baseline
        if normal_3_day_baseline > 0
        else 1.0
    )

    typical_large_outflow = restock["typical_large_outflow_rm"] or 0.0
    typical_cycle = restock["typical_cycle_days"] or 0.0
    days_since_last = restock["days_since_last_large_outflow"] or 0

    restock_due_score = (
        clamp(days_since_last / typical_cycle, 0.0, 1.25)
        if typical_cycle > 0
        else 0.0
    )
    balance_coverage = (
        current_balance_rm / typical_large_outflow if typical_large_outflow > 0 else 1.0
    )
    balance_pressure_score = clamp(1.0 - balance_coverage, 0.0, 1.0)
    forecast_pressure_score = clamp((forecast_ratio - 1.0) / 0.35, 0.0, 1.0)
    restock_pressure_score = clamp(restock_due_score, 0.0, 1.0)

    demand_pressure_score = round(
        100
        * (
            0.35 * forecast_pressure_score
            + 0.35 * restock_pressure_score
            + 0.30 * balance_pressure_score
        ),
        1,
    )

    cash_gap = max(0.0, typical_large_outflow - current_balance_rm)
    suggested_bnpl = round_up_to_nearest(cash_gap, 50)
    avg_forecast_daily = projected_3_day_inflow / 3 if next3 else 0.0
    expected_daily_repayment = round_money(avg_forecast_daily * 0.05)
    repayment_days = (
        math.ceil(suggested_bnpl / expected_daily_repayment)
        if expected_daily_repayment > 0 and suggested_bnpl > 0
        else 0
    )

    active_days = sum(1 for r in daily if r.money_in_rm > 0)
    data_volume_score = clamp(active_days / 60, 0, 1)
    restock_count_score = clamp((restock["large_outflow_count"] or 0) / 6, 0, 1)
    pattern_score = float(restock["gap_consistency_score"] or 0.0)
    confidence = round(
        100
        * (
            0.45 * data_volume_score + 0.30 * restock_count_score + 0.25 * pattern_score
        ),
        1,
    )

    if demand_pressure_score >= 70:
        pressure_label = "High"
    elif demand_pressure_score >= 40:
        pressure_label = "Medium"
    else:
        pressure_label = "Low"

    return {
        "as_of_date": as_of.isoformat(),
        "current_balance_rm": round_money(current_balance_rm),
        "projected_3_day_inflow_rm": round_money(projected_3_day_inflow),
        "normal_3_day_baseline_rm": round_money(normal_3_day_baseline),
        "forecast_ratio_vs_baseline": round(forecast_ratio, 3),
        "recent_momentum_multiplier": momentum,
        "typical_large_outflow_rm": round_money(typical_large_outflow),
        "typical_cycle_days": typical_cycle,
        "last_large_outflow_date": restock["last_large_outflow_date"],
        "days_since_last_large_outflow": days_since_last,
        "balance_coverage_ratio": round(balance_coverage, 4),
        "estimated_cash_gap_rm": round_money(cash_gap),
        "suggested_bnpl_topup_rm": round_money(suggested_bnpl),
        "expected_5pct_daily_repayment_rm": expected_daily_repayment,
        "estimated_repayment_days": repayment_days,
        "demand_pressure_score": demand_pressure_score,
        "demand_pressure_label": pressure_label,
        "confidence_score": confidence,
        "important_caveat": (
            "Large OUT transactions are inferred as restock-like from amount/timing only. "
            "The engine does not know the true transaction purpose."
        ),
    }


def build_llm_summary(summary: dict[str, Any]) -> dict[str, Any]:
    def rm_text(value: float) -> str:
        return f"RM{value:,.2f}"

    forecast_ratio = float(summary["forecast_ratio_vs_baseline"])
    uplift_pct = round((forecast_ratio - 1.0) * 100, 1)
    typical_large_outflow = float(summary["typical_large_outflow_rm"] or 0.0)
    current_balance = float(summary["current_balance_rm"])
    balance_coverage_ratio = float(summary["balance_coverage_ratio"])
    balance_coverage_pct = round(balance_coverage_ratio * 100, 1)
    typical_cycle = float(summary["typical_cycle_days"] or 0.0)
    days_since_last = int(summary["days_since_last_large_outflow"] or 0)

    reason_codes: list[dict[str, str]] = []
    if forecast_ratio > 1.0:
        reason_codes.append(
            {
                "code": "INFLOW_ABOVE_BASELINE",
                "severity": "medium" if forecast_ratio < 1.35 else "high",
                "message": (
                    f"Projected 3-day money-in is {rm_text(summary['projected_3_day_inflow_rm'])}, "
                    f"which is {uplift_pct}% above the normal 3-day baseline of "
                    f"{rm_text(summary['normal_3_day_baseline_rm'])}."
                ),
            }
        )

    if typical_cycle > 0 and days_since_last >= 0.75 * typical_cycle:
        reason_codes.append(
            {
                "code": "LARGE_OUTFLOW_CYCLE_DUE",
                "severity": (
                    "high" if days_since_last >= 0.875 * typical_cycle else "medium"
                ),
                "message": (
                    "A large OUT pattern appears close to due: "
                    f"the typical cycle is {typical_cycle:g} days, and it has been "
                    f"{days_since_last} days since the last large OUT on "
                    f"{summary['last_large_outflow_date']}."
                ),
            }
        )

    if typical_large_outflow > 0 and current_balance < typical_large_outflow:
        reason_codes.append(
            {
                "code": "LOW_BALANCE_VS_OUTFLOW",
                "severity": "high" if balance_coverage_ratio < 0.5 else "medium",
                "message": (
                    f"Current balance is {rm_text(current_balance)}, covering only "
                    f"{balance_coverage_pct}% of the typical large OUT amount of "
                    f"{rm_text(typical_large_outflow)}."
                ),
            }
        )

    if float(summary["suggested_bnpl_topup_rm"]) > 0:
        reason_codes.append(
            {
                "code": "BNPL_TOPUP_RECOMMENDED",
                "severity": "action",
                "message": (
                    f"Estimated cash gap is {rm_text(summary['estimated_cash_gap_rm'])}, "
                    "so the suggested BNPL top-up is rounded to "
                    f"{rm_text(summary['suggested_bnpl_topup_rm'])}."
                ),
            }
        )

    if (
        float(summary["expected_5pct_daily_repayment_rm"]) > 0
        and int(summary["estimated_repayment_days"]) > 0
    ):
        reason_codes.append(
            {
                "code": "REPAYMENT_ESTIMATE",
                "severity": "info",
                "message": (
                    "At a 5% repayment rate from projected money-in, expected repayment is "
                    f"{rm_text(summary['expected_5pct_daily_repayment_rm'])} per day over "
                    f"about {summary['estimated_repayment_days']} days."
                ),
            }
        )

    return {
        "as_of_date": summary["as_of_date"],
        "data_assumption": (
            "Transaction history only has datetime and signed amount_rm. Positive means money IN, "
            "negative means money OUT. Current balance is provided separately."
        ),
        "result": {
            "demand_pressure_score": summary["demand_pressure_score"],
            "demand_pressure_label": summary["demand_pressure_label"],
            "confidence_score": summary["confidence_score"],
        },
        "calculation_trace": {
            "forecast_ratio_vs_baseline": summary["forecast_ratio_vs_baseline"],
            "recent_momentum_multiplier": summary["recent_momentum_multiplier"],
            "projected_3_day_inflow_rm": summary["projected_3_day_inflow_rm"],
            "normal_3_day_baseline_rm": summary["normal_3_day_baseline_rm"],
            "typical_large_outflow_rm": summary["typical_large_outflow_rm"],
            "typical_cycle_days": summary["typical_cycle_days"],
            "last_large_outflow_date": summary["last_large_outflow_date"],
            "days_since_last_large_outflow": summary["days_since_last_large_outflow"],
            "current_balance_rm": summary["current_balance_rm"],
            "balance_coverage_ratio": summary["balance_coverage_ratio"],
            "estimated_cash_gap_rm": summary["estimated_cash_gap_rm"],
            "suggested_bnpl_topup_rm": summary["suggested_bnpl_topup_rm"],
            "expected_5pct_daily_repayment_rm": summary[
                "expected_5pct_daily_repayment_rm"
            ],
            "estimated_repayment_days": summary["estimated_repayment_days"],
        },
        "reason_codes": reason_codes,
        "caveats": [summary["important_caveat"]],
    }


def build_mock_demand_pressure_summary(
    current_balance_rm: float = 760.0,
    as_of: date = date(2026, 4, 25),
    forecast_days: int = DEFAULT_FORECAST_DAYS,
    state: str = DEFAULT_STATE,
    csv_path: Path = MOCK_TRANSACTIONS_PATH,
) -> dict[str, Any]:
    if forecast_days < 1:
        raise MsmeDemandPressureError("forecast_days must be at least 1.")

    txns = load_transactions_csv(csv_path, as_of)
    start = min(t.datetime.date() for t in txns)
    end = as_of

    years = sorted({start.year, as_of.year, (as_of + timedelta(days=forecast_days)).year})
    holidays: dict[date, str] = {}
    for year in years:
        holidays.update(load_malaysia_holidays(year, state))

    large_threshold = infer_large_outflow_threshold(txns)
    daily = aggregate_daily(txns, start, end, large_threshold)
    forecast, momentum = build_forecast(daily, as_of, holidays, forecast_days)
    restock = infer_large_outflow_pattern(daily, as_of)
    summary = build_summary(
        daily=daily,
        forecast=forecast,
        restock=restock,
        current_balance_rm=current_balance_rm,
        as_of=as_of,
        momentum=momentum,
    )
    return build_llm_summary(summary)
