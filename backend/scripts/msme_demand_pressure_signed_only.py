#!/usr/bin/env python3
"""
MSME Demand Pressure Simulation (Signed-Transaction-Only Version)

Assumption:
- Historical transaction rows contain ONLY:
    datetime, amount_rm
- amount_rm > 0 means money IN
- amount_rm < 0 means money OUT
- current wallet balance is known separately as a single value today

What this script does:
1. Generates realistic mock signed transaction data for a Malaysian MSME.
2. Loads Malaysia holiday/calendar context, using an optional public API first and a fallback list if unavailable.
3. Runs a rule-based demand/liquidity pressure engine using only:
   - money-in rhythm
   - money-out rhythm
   - large outflow cycle
   - today's current balance
   - calendar context
4. Exports raw transactions, daily features, forecast, and summary.

No ML. No merchant category. No transaction labels. No historical wallet balance.
"""

from __future__ import annotations

import csv
import json
import math
import random
import statistics
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta, time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

# ----------------------------
# Config
# ----------------------------
SEED = 42
START_DATE = date(2026, 1, 26)
AS_OF_DATE = date(2026, 4, 25)
FORECAST_DAYS = 7
CURRENT_BALANCE_RM = (
    760.00  # known separately today; not derived from transaction history
)
STATE = "selangor"
OUTPUT_DIR = Path("mock_output")

# Optional public holiday API.
# If it fails, the script automatically uses FALLBACK_HOLIDAYS.
# Disabled by default so the demo works offline and never hangs.
USE_HOLIDAY_API = True
HOLIDAY_API_URL = "https://sabah-holiday.dydxsoft.my/api/{state}/{year}.json"

# Keep fallback small and demo-relevant. Add more dates as needed.
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


@dataclass
class Txn:
    datetime: datetime
    amount_rm: float


@dataclass
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


@dataclass
class ForecastRow:
    date: date
    weekday: str
    weekday_avg_inflow_rm: float
    momentum_multiplier: float
    calendar_multiplier: float
    calendar_reasons: str
    forecast_inflow_rm: float


# ----------------------------
# Utilities
# ----------------------------
def daterange(start: date, end: date) -> Iterable[date]:
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


def parse_holiday_date(raw_date: object, year: int) -> Optional[date]:
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


def percentile(values: List[float], p: float) -> float:
    """Small no-dependency percentile helper."""
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


def weighted_positive_amounts(total: float, count: int) -> List[float]:
    """
    Split a daily sales-like inflow target into many small positive transactions.
    This creates realistic micro-MSME transaction sizes without using labels.
    """
    if count <= 0 or total <= 0:
        return []
    weights = [random.gammavariate(2.0, 1.0) for _ in range(count)]
    weight_sum = sum(weights)
    amounts = [round_money(total * w / weight_sum) for w in weights]

    # Fix rounding drift on the last txn.
    drift = round_money(total - sum(amounts))
    amounts[-1] = round_money(amounts[-1] + drift)
    return [a for a in amounts if a > 0]


def random_time_between(start_hour: int, end_hour: int) -> time:
    hour = random.randint(start_hour, end_hour)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return time(hour, minute, second)


# ----------------------------
# Calendar context
# ----------------------------
def load_malaysia_holidays(year: int, state: str = STATE) -> Dict[date, str]:
    """
    Try API first when USE_HOLIDAY_API=True. If API fails or schema changes,
    fall back to a built-in demo list. The engine does not depend on exact
    holiday completeness.
    """
    if not USE_HOLIDAY_API:
        return {d: name for d, name in FALLBACK_HOLIDAYS.items() if d.year == year}

    url = HOLIDAY_API_URL.format(state=state, year=year)
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))

        holidays: Dict[date, str] = {}

        # Be flexible about schema: list of dicts or dict with data/holidays keys.
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
            if not raw_date:
                continue
            parsed = parse_holiday_date(raw_date, year)
            if parsed:
                holidays[parsed] = str(name)

        if holidays:
            return holidays
    except Exception:
        pass

    print(f"Failed to load holidays from API for {state} {year}. Using fallback list.")

    return {d: name for d, name in FALLBACK_HOLIDAYS.items() if d.year == year}


def calendar_multiplier(d: date, holidays: Dict[date, str]) -> Tuple[float, List[str]]:
    """
    Generic Malaysia calendar uplift, no merchant profile.
    Since weekday average already captures weekend behavior, this only handles payday and holiday windows.
    """
    multiplier = 1.0
    reasons: List[str] = []

    # Payday window: many Malaysian salaries land around month-end / start-month.
    if d.day >= 25 or d.day <= 1:
        multiplier *= 1.08
        reasons.append("payday window")

    # Public holiday / festive lead-up.
    if d in holidays:
        # On the holiday itself, some merchants spike and some close.
        # With no merchant profile, keep it neutral/slightly lower.
        multiplier *= 0.95
        reasons.append(f"holiday: {holidays[d]}")
    else:
        upcoming = [(hdate - d).days for hdate in holidays if 0 < (hdate - d).days <= 7]
        if upcoming:
            days_to = min(upcoming)
            # Closer to the holiday => stronger generic uplift, capped.
            leadup = 1.00 + (8 - days_to) * 0.025
            leadup = clamp(leadup, 1.025, 1.175)
            multiplier *= leadup
            reasons.append(f"{days_to}d before public holiday")

    return round(multiplier, 4), reasons


# ----------------------------
# Mock data generation
# ----------------------------
def target_daily_inflow(d: date, holidays: Dict[date, str]) -> float:
    """
    Intentionally shaped pattern:
    - Fri/Sat are stronger.
    - Recent period is hotter.
    - Payday and holiday lead-up add uplift.
    """
    weekday_base = {
        0: 430,  # Mon
        1: 460,
        2: 520,
        3: 570,
        4: 790,  # Fri
        5: 930,  # Sat
        6: 280,  # Sun
    }[d.weekday()]

    trend = 1.00
    if d >= AS_OF_DATE - timedelta(days=14):
        trend *= 1.18  # recent momentum
    elif d >= AS_OF_DATE - timedelta(days=35):
        trend *= 1.08

    cal_mult, _ = calendar_multiplier(d, holidays)

    # Controlled noise so generated data is realistic but still explains the desired insight.
    noise = random.uniform(0.90, 1.10)
    return round_money(weekday_base * trend * cal_mult * noise)


def generate_mock_transactions(
    start: date, end: date, holidays: Dict[date, str]
) -> List[Txn]:
    """
    Generates ONLY datetime + signed amount_rm.
    Positive = money in, negative = money out.

    The engine never sees labels. This function intentionally creates:
    - small frequent IN transactions
    - small occasional OUT transactions
    - large periodic OUT transactions roughly every 8 days
    """
    random.seed(SEED)
    txns: List[Txn] = []

    # Large outflows every ~8 days, shaped so the last one is 7 days before AS_OF_DATE.
    large_outflow_dates = set()
    first_restock = date(2026, 1, 28)
    d = first_restock
    while d <= end:
        large_outflow_dates.add(d)
        d += timedelta(days=8)

    for d in daterange(start, end):
        # Money-in: many small transactions. Sunday still has some activity.
        daily_total = target_daily_inflow(d, holidays)
        txn_count = max(4, int(daily_total / random.uniform(14, 24)))
        amounts = weighted_positive_amounts(daily_total, txn_count)
        for amount in amounts:
            txns.append(
                Txn(
                    datetime=datetime.combine(d, random_time_between(7, 22)),
                    amount_rm=amount,
                )
            )

        # Small generic outflows: operating expenses, cash movements, fees, etc.
        small_out_count = random.choices([0, 1, 2], weights=[0.45, 0.40, 0.15])[0]
        for _ in range(small_out_count):
            amount = round_money(random.uniform(15, 95))
            txns.append(
                Txn(
                    datetime=datetime.combine(d, random_time_between(9, 21)),
                    amount_rm=-amount,
                )
            )

        # Large periodic outflow: inferred later as restock-like rhythm.
        if d in large_outflow_dates:
            # Typical large outflow around RM1.7k-RM2.1k, slightly higher in recent period.
            base = random.uniform(1650, 2050)
            if d >= AS_OF_DATE - timedelta(days=30):
                base *= random.uniform(1.02, 1.10)
            amount = round_money(base)
            txns.append(
                Txn(
                    datetime=datetime.combine(d, random_time_between(10, 13)),
                    amount_rm=-amount,
                )
            )

    txns.sort(key=lambda x: x.datetime)
    return txns


# ----------------------------
# Feature engineering
# ----------------------------
def aggregate_daily(
    txns: List[Txn], start: date, end: date, large_outflow_threshold: float
) -> List[DailyActivity]:
    by_day: Dict[date, List[Txn]] = {d: [] for d in daterange(start, end)}
    for t in txns:
        by_day.setdefault(t.datetime.date(), []).append(t)

    rows: List[DailyActivity] = []
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


def infer_large_outflow_threshold(txns: List[Txn]) -> float:
    out_amounts = [abs(t.amount_rm) for t in txns if t.amount_rm < 0]
    if not out_amounts:
        return 500.0

    # The floor protects against classifying normal small withdrawals as restock-like.
    # The percentile adapts upward if the merchant has generally larger outflows.
    return round_money(max(500.0, percentile(out_amounts, 0.90)))


def weekday_average_inflows(
    daily: List[DailyActivity], as_of: date
) -> Dict[int, float]:
    # Use historical days strictly before as_of.
    values_by_weekday: Dict[int, List[float]] = {i: [] for i in range(7)}
    for row in daily:
        if row.date < as_of:
            values_by_weekday[row.date.weekday()].append(row.money_in_rm)

    overall = statistics.mean([row.money_in_rm for row in daily if row.date < as_of])
    result = {}
    for wd, values in values_by_weekday.items():
        result[wd] = round_money(statistics.mean(values) if values else overall)
    return result


def recent_momentum(daily: List[DailyActivity], as_of: date) -> float:
    last_7 = [
        r.money_in_rm for r in daily if as_of - timedelta(days=7) <= r.date < as_of
    ]
    prev_21 = [
        r.money_in_rm
        for r in daily
        if as_of - timedelta(days=28) <= r.date < as_of - timedelta(days=7)
    ]

    if not last_7 or not prev_21 or statistics.mean(prev_21) == 0:
        return 1.0

    raw = statistics.mean(last_7) / statistics.mean(prev_21)
    return round(clamp(raw, 0.75, 1.35), 4)


def infer_restock_pattern(daily: List[DailyActivity]) -> Dict[str, Optional[float]]:
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
        # Lower coefficient of variation => more consistent pattern.
        cv = statistics.pstdev(gaps) / statistics.mean(gaps)
        consistency = clamp(1.0 - cv, 0.0, 1.0)
    else:
        consistency = 0.5 if gaps else 0.0

    return {
        "large_outflow_count": len(large_days),
        "typical_large_outflow_rm": round_money(statistics.median(large_amounts)),
        "typical_cycle_days": (
            float(typical_cycle) if typical_cycle is not None else None
        ),
        "last_large_outflow_date": large_days[-1].isoformat(),
        "days_since_last_large_outflow": (AS_OF_DATE - large_days[-1]).days,
        "gap_consistency_score": round(consistency, 4),
    }


def build_forecast(
    daily: List[DailyActivity],
    as_of: date,
    holidays: Dict[date, str],
    days: int = FORECAST_DAYS,
) -> Tuple[List[ForecastRow], float]:
    weekday_avgs = weekday_average_inflows(daily, as_of)
    momentum = recent_momentum(daily, as_of)

    forecast: List[ForecastRow] = []
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


# ----------------------------
# Scoring and summary
# ----------------------------
def demand_pressure_summary(
    daily: List[DailyActivity],
    forecast: List[ForecastRow],
    restock: Dict[str, Optional[float]],
    current_balance_rm: float,
) -> Dict[str, object]:
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

    if typical_cycle > 0:
        restock_due_score = clamp(days_since_last / typical_cycle, 0.0, 1.25)
    else:
        restock_due_score = 0.0

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

    # Confidence: honest scoring for thin data.
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
        "as_of_date": AS_OF_DATE.isoformat(),
        "input_assumption": "history has only datetime and signed amount_rm; current balance is provided separately",
        "current_balance_rm": round_money(current_balance_rm),
        "projected_3_day_inflow_rm": round_money(projected_3_day_inflow),
        "normal_3_day_baseline_rm": round_money(normal_3_day_baseline),
        "forecast_ratio_vs_baseline": round(forecast_ratio, 3),
        "typical_large_outflow_rm": round_money(typical_large_outflow),
        "typical_cycle_days": typical_cycle,
        "last_large_outflow_date": restock["last_large_outflow_date"],
        "days_since_last_large_outflow": days_since_last,
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


# ----------------------------
# LLM-friendly calculation details
# ----------------------------
def mean_or_zero(values: List[float]) -> float:
    return round_money(statistics.mean(values)) if values else 0.0


def min_or_none(values: List[float]) -> Optional[float]:
    return round_money(min(values)) if values else None


def max_or_none(values: List[float]) -> Optional[float]:
    return round_money(max(values)) if values else None


def build_calculation_details(
    txns: List[Txn],
    daily: List[DailyActivity],
    forecast: List[ForecastRow],
    restock: Dict[str, Optional[float]],
    summary: Dict[str, object],
    holidays: Dict[date, str],
    current_balance_rm: float,
    large_outflow_threshold: float,
    momentum: float,
    as_of: date,
) -> Dict[str, object]:
    positive_txns = [t for t in txns if t.amount_rm > 0]
    negative_txns = [t for t in txns if t.amount_rm < 0]
    money_in = sum(t.amount_rm for t in positive_txns)
    money_out = sum(abs(t.amount_rm) for t in negative_txns)
    active_days = sum(1 for r in daily if r.money_in_rm > 0)

    weekday_rows: List[Dict[str, object]] = []
    for wd in range(7):
        rows = [r for r in daily if r.date < as_of and r.date.weekday() == wd]
        inflows = [r.money_in_rm for r in rows]
        outflows = [r.money_out_rm for r in rows]
        net_flows = [r.net_flow_rm for r in rows]
        in_counts = [float(r.in_txn_count) for r in rows]
        out_counts = [float(r.out_txn_count) for r in rows]
        weekday_rows.append(
            {
                "weekday": date(2026, 1, 5 + wd).strftime("%A"),
                "observed_days": len(rows),
                "avg_money_in_rm": mean_or_zero(inflows),
                "avg_money_out_rm": mean_or_zero(outflows),
                "avg_net_flow_rm": mean_or_zero(net_flows),
                "avg_in_txn_count": round(mean_or_zero(in_counts), 2),
                "avg_out_txn_count": round(mean_or_zero(out_counts), 2),
                "min_money_in_rm": min_or_none(inflows),
                "max_money_in_rm": max_or_none(inflows),
            }
        )

    last_7_rows = [r for r in daily if as_of - timedelta(days=7) <= r.date < as_of]
    prev_21_rows = [
        r
        for r in daily
        if as_of - timedelta(days=28) <= r.date < as_of - timedelta(days=7)
    ]
    last_7_avg = mean_or_zero([r.money_in_rm for r in last_7_rows])
    prev_21_avg = mean_or_zero([r.money_in_rm for r in prev_21_rows])
    raw_momentum = round(last_7_avg / prev_21_avg, 4) if prev_21_avg > 0 else 1.0

    large_rows = [r for r in daily if r.has_large_outflow]
    large_dates = [r.date for r in large_rows]
    large_gaps = [
        (large_dates[i] - large_dates[i - 1]).days for i in range(1, len(large_dates))
    ]

    next3 = forecast[:3]
    projected_3_day_inflow = sum(r.forecast_inflow_rm for r in next3)
    normal_3_day_baseline = sum(r.weekday_avg_inflow_rm for r in next3)
    forecast_ratio = (
        projected_3_day_inflow / normal_3_day_baseline
        if normal_3_day_baseline > 0
        else 1.0
    )

    typical_large_outflow = float(restock["typical_large_outflow_rm"] or 0.0)
    typical_cycle = float(restock["typical_cycle_days"] or 0.0)
    days_since_last = int(restock["days_since_last_large_outflow"] or 0)
    restock_due_score = (
        clamp(days_since_last / typical_cycle, 0.0, 1.25) if typical_cycle > 0 else 0.0
    )
    balance_coverage = (
        current_balance_rm / typical_large_outflow if typical_large_outflow > 0 else 1.0
    )
    balance_pressure_score = clamp(1.0 - balance_coverage, 0.0, 1.0)
    forecast_pressure_score = clamp((forecast_ratio - 1.0) / 0.35, 0.0, 1.0)
    restock_pressure_score = clamp(restock_due_score, 0.0, 1.0)

    cash_gap = max(0.0, typical_large_outflow - current_balance_rm)
    suggested_bnpl = round_up_to_nearest(cash_gap, 50)
    avg_forecast_daily_3d = projected_3_day_inflow / 3 if next3 else 0.0
    expected_daily_repayment = round_money(avg_forecast_daily_3d * 0.05)
    repayment_days = (
        math.ceil(suggested_bnpl / expected_daily_repayment)
        if expected_daily_repayment > 0 and suggested_bnpl > 0
        else 0
    )

    data_volume_score = clamp(active_days / 60, 0, 1)
    restock_count_score = clamp((restock["large_outflow_count"] or 0) / 6, 0, 1)
    pattern_score = float(restock["gap_consistency_score"] or 0.0)

    return {
        "input_snapshot": {
            "history_start_date": daily[0].date.isoformat() if daily else None,
            "history_end_date": daily[-1].date.isoformat() if daily else None,
            "as_of_date": as_of.isoformat(),
            "forecast_days": len(forecast),
            "current_balance_rm": round_money(current_balance_rm),
            "large_outflow_threshold_rm": round_money(large_outflow_threshold),
            "holiday_count_loaded": len(holidays),
            "holidays_loaded": [
                {"date": d.isoformat(), "holiday_name": name}
                for d, name in sorted(holidays.items())
            ],
        },
        "overall_flow_stats": {
            "transaction_count": len(txns),
            "money_in_txn_count": len(positive_txns),
            "money_out_txn_count": len(negative_txns),
            "active_days": active_days,
            "total_money_in_rm": round_money(money_in),
            "total_money_out_rm": round_money(money_out),
            "net_flow_rm": round_money(money_in - money_out),
            "avg_daily_money_in_rm": mean_or_zero([r.money_in_rm for r in daily]),
            "avg_daily_money_out_rm": mean_or_zero([r.money_out_rm for r in daily]),
            "avg_daily_net_flow_rm": mean_or_zero([r.net_flow_rm for r in daily]),
        },
        "weekday_averages": weekday_rows,
        "momentum_calculation": {
            "last_7_day_start": (as_of - timedelta(days=7)).isoformat(),
            "last_7_day_end": (as_of - timedelta(days=1)).isoformat(),
            "last_7_day_count": len(last_7_rows),
            "last_7_avg_inflow_rm": last_7_avg,
            "previous_21_day_start": (as_of - timedelta(days=28)).isoformat(),
            "previous_21_day_end": (as_of - timedelta(days=8)).isoformat(),
            "previous_21_day_count": len(prev_21_rows),
            "previous_21_avg_inflow_rm": prev_21_avg,
            "raw_momentum_ratio": raw_momentum,
            "capped_momentum_multiplier": momentum,
        },
        "large_outflow_rhythm": {
            "large_outflow_count": len(large_rows),
            "large_outflow_events": [
                {"date": r.date.isoformat(), "amount_rm": r.large_outflow_rm}
                for r in large_rows
            ],
            "gaps_between_large_outflows_days": large_gaps,
            "avg_gap_days": (
                round(statistics.mean(large_gaps), 2) if large_gaps else None
            ),
            "median_gap_days": (
                round(statistics.median(large_gaps), 2) if large_gaps else None
            ),
            "typical_large_outflow_rm": round_money(typical_large_outflow),
            "typical_cycle_days": typical_cycle,
            "last_large_outflow_date": restock["last_large_outflow_date"],
            "days_since_last_large_outflow": days_since_last,
            "gap_consistency_score": pattern_score,
        },
        "forecast_breakdown": [
            {
                "date": r.date.isoformat(),
                "weekday": r.weekday,
                "weekday_avg_inflow_rm": r.weekday_avg_inflow_rm,
                "momentum_multiplier": r.momentum_multiplier,
                "calendar_multiplier": r.calendar_multiplier,
                "calendar_reasons": r.calendar_reasons,
                "forecast_inflow_rm": r.forecast_inflow_rm,
            }
            for r in forecast
        ],
        "demand_pressure_score_calculation": {
            "formula": "100 * (0.35 * forecast_pressure_score + 0.35 * restock_pressure_score + 0.30 * balance_pressure_score)",
            "projected_3_day_inflow_rm": round_money(projected_3_day_inflow),
            "normal_3_day_baseline_rm": round_money(normal_3_day_baseline),
            "forecast_ratio_vs_baseline": round(forecast_ratio, 4),
            "forecast_pressure_score_0_to_1": round(forecast_pressure_score, 4),
            "restock_due_score_raw": round(restock_due_score, 4),
            "restock_pressure_score_0_to_1": round(restock_pressure_score, 4),
            "balance_coverage_ratio": round(balance_coverage, 4),
            "balance_pressure_score_0_to_1": round(balance_pressure_score, 4),
            "weighted_forecast_component_points": round(
                100 * 0.35 * forecast_pressure_score, 2
            ),
            "weighted_restock_component_points": round(
                100 * 0.35 * restock_pressure_score, 2
            ),
            "weighted_balance_component_points": round(
                100 * 0.30 * balance_pressure_score, 2
            ),
            "final_demand_pressure_score": summary["demand_pressure_score"],
            "final_demand_pressure_label": summary["demand_pressure_label"],
        },
        "bnpl_repayment_calculation": {
            "typical_large_outflow_rm": round_money(typical_large_outflow),
            "current_balance_rm": round_money(current_balance_rm),
            "cash_gap_rm": round_money(cash_gap),
            "rounded_topup_step_rm": 50,
            "suggested_bnpl_topup_rm": round_money(suggested_bnpl),
            "avg_forecast_daily_inflow_next_3d_rm": round_money(avg_forecast_daily_3d),
            "repayment_rate": 0.05,
            "expected_daily_repayment_rm": expected_daily_repayment,
            "estimated_repayment_days": repayment_days,
        },
        "confidence_score_calculation": {
            "formula": "100 * (0.45 * data_volume_score + 0.30 * restock_count_score + 0.25 * pattern_consistency_score)",
            "active_days": active_days,
            "data_volume_score_0_to_1": round(data_volume_score, 4),
            "large_outflow_count": restock["large_outflow_count"] or 0,
            "restock_count_score_0_to_1": round(restock_count_score, 4),
            "pattern_consistency_score_0_to_1": round(pattern_score, 4),
            "weighted_data_volume_points": round(100 * 0.45 * data_volume_score, 2),
            "weighted_restock_count_points": round(100 * 0.30 * restock_count_score, 2),
            "weighted_pattern_points": round(100 * 0.25 * pattern_score, 2),
            "final_confidence_score": summary["confidence_score"],
        },
    }


def print_calculation_details(details: Dict[str, object]) -> None:
    overall = details["overall_flow_stats"]
    momentum_calc = details["momentum_calculation"]
    outflow = details["large_outflow_rhythm"]
    score = details["demand_pressure_score_calculation"]
    bnpl = details["bnpl_repayment_calculation"]
    confidence = details["confidence_score_calculation"]

    print("\n=== Calculation Details for LLM Context ===")
    print("\nOverall Flow Stats")
    print(
        f"- Total money IN / OUT:      RM{overall['total_money_in_rm']:,.2f} / RM{overall['total_money_out_rm']:,.2f}"
    )
    print(f"- Net flow:                  RM{overall['net_flow_rm']:,.2f}")
    print(f"- Active days:               {overall['active_days']}")

    print("\nWeekday Averages")
    print("weekday   days  avg_in    avg_out   avg_net   avg_in_txn  min_in    max_in")
    for row in details["weekday_averages"]:
        print(
            f"{row['weekday']:<9} "
            f"{row['observed_days']:>4}  "
            f"{row['avg_money_in_rm']:>8,.2f}  "
            f"{row['avg_money_out_rm']:>8,.2f}  "
            f"{row['avg_net_flow_rm']:>8,.2f}  "
            f"{row['avg_in_txn_count']:>10,.2f}  "
            f"{(row['min_money_in_rm'] or 0):>8,.2f}  "
            f"{(row['max_money_in_rm'] or 0):>8,.2f}"
        )

    print("\nMomentum Calculation")
    print(
        f"- Last 7-day avg IN:         RM{momentum_calc['last_7_avg_inflow_rm']:,.2f}"
    )
    print(
        f"- Previous 21-day avg IN:    RM{momentum_calc['previous_21_avg_inflow_rm']:,.2f}"
    )
    print(
        f"- Raw / capped momentum:     {momentum_calc['raw_momentum_ratio']:.4f} / {momentum_calc['capped_momentum_multiplier']:.4f}"
    )

    print("\nLarge Outflow Rhythm")
    print(f"- Large OUT count:           {outflow['large_outflow_count']}")
    print(f"- Typical large OUT:         RM{outflow['typical_large_outflow_rm']:,.2f}")
    print(
        f"- Avg / median gap days:     {outflow['avg_gap_days']} / {outflow['median_gap_days']}"
    )
    print(f"- Days since last large OUT: {outflow['days_since_last_large_outflow']}")

    print("\nDemand Pressure Score Components")
    print(
        f"- Forecast points:           {score['weighted_forecast_component_points']:.2f}"
    )
    print(
        f"- Restock points:            {score['weighted_restock_component_points']:.2f}"
    )
    print(
        f"- Balance points:            {score['weighted_balance_component_points']:.2f}"
    )
    print(f"- Final pressure score:      {score['final_demand_pressure_score']}/100")

    print("\nBNPL / Repayment Calculation")
    print(f"- Cash gap:                  RM{bnpl['cash_gap_rm']:,.2f}")
    print(f"- Suggested top-up:          RM{bnpl['suggested_bnpl_topup_rm']:,.2f}")
    print(f"- Daily repayment estimate:  RM{bnpl['expected_daily_repayment_rm']:,.2f}")
    print(f"- Repayment days:            {bnpl['estimated_repayment_days']}")

    print("\nConfidence Calculation")
    print(
        f"- Data volume points:        {confidence['weighted_data_volume_points']:.2f}"
    )
    print(
        f"- Restock count points:      {confidence['weighted_restock_count_points']:.2f}"
    )
    print(f"- Pattern points:            {confidence['weighted_pattern_points']:.2f}")
    print(f"- Final confidence score:    {confidence['final_confidence_score']}/100")


def rm_text(value: float) -> str:
    return f"RM{value:,.2f}"


def build_llm_summary(summary: Dict[str, object]) -> Dict[str, object]:
    details = summary["debug_calculation_details"]
    score = details["demand_pressure_score_calculation"]
    bnpl = details["bnpl_repayment_calculation"]

    projected_3_day = float(score["projected_3_day_inflow_rm"])
    baseline_3_day = float(score["normal_3_day_baseline_rm"])
    forecast_ratio = float(score["forecast_ratio_vs_baseline"])
    uplift_pct = round((forecast_ratio - 1.0) * 100, 1)

    typical_large_outflow = float(bnpl["typical_large_outflow_rm"])
    current_balance = float(bnpl["current_balance_rm"])
    balance_coverage_ratio = float(score["balance_coverage_ratio"])
    balance_coverage_pct = round(balance_coverage_ratio * 100, 1)

    typical_cycle = float(summary["typical_cycle_days"] or 0.0)
    days_since_last = int(summary["days_since_last_large_outflow"] or 0)
    last_large_outflow_date = summary["last_large_outflow_date"]
    cash_gap = float(bnpl["cash_gap_rm"])
    suggested_topup = float(bnpl["suggested_bnpl_topup_rm"])
    expected_daily_repayment = float(bnpl["expected_daily_repayment_rm"])
    repayment_days = int(bnpl["estimated_repayment_days"])

    reason_codes = []
    if forecast_ratio > 1.0:
        reason_codes.append(
            {
                "code": "INFLOW_ABOVE_BASELINE",
                "severity": "medium" if forecast_ratio < 1.35 else "high",
                "message": (
                    f"Projected 3-day money-in is {rm_text(projected_3_day)}, "
                    f"which is {uplift_pct}% above the normal 3-day baseline of {rm_text(baseline_3_day)}."
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
                    f"the typical cycle is {typical_cycle:g} days, and it has been {days_since_last} days "
                    f"since the last large OUT on {last_large_outflow_date}."
                ),
            }
        )

    if typical_large_outflow > 0 and current_balance < typical_large_outflow:
        reason_codes.append(
            {
                "code": "LOW_BALANCE_VS_OUTFLOW",
                "severity": "high" if balance_coverage_ratio < 0.5 else "medium",
                "message": (
                    f"Current balance is {rm_text(current_balance)}, covering only {balance_coverage_pct}% "
                    f"of the typical large OUT amount of {rm_text(typical_large_outflow)}."
                ),
            }
        )

    if suggested_topup > 0:
        reason_codes.append(
            {
                "code": "BNPL_TOPUP_RECOMMENDED",
                "severity": "action",
                "message": (
                    f"Estimated cash gap is {rm_text(cash_gap)}, so the suggested BNPL top-up "
                    f"is rounded to {rm_text(suggested_topup)}."
                ),
            }
        )

    if expected_daily_repayment > 0 and repayment_days > 0:
        reason_codes.append(
            {
                "code": "REPAYMENT_ESTIMATE",
                "severity": "info",
                "message": (
                    "At a 5% repayment rate from projected money-in, expected repayment is "
                    f"{rm_text(expected_daily_repayment)} per day over about {repayment_days} days."
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
            "balance_coverage_ratio": score["balance_coverage_ratio"],
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


# ----------------------------
# CSV / JSON outputs
# ----------------------------
def write_transactions_csv(txns: List[Txn], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["datetime", "amount_rm"])
        writer.writeheader()
        for t in txns:
            writer.writerow(
                {
                    "datetime": t.datetime.isoformat(sep=" ", timespec="seconds"),
                    "amount_rm": f"{t.amount_rm:.2f}",
                }
            )


def write_daily_csv(rows: List[DailyActivity], path: Path) -> None:
    fieldnames = [
        "date",
        "weekday",
        "money_in_rm",
        "in_txn_count",
        "money_out_rm",
        "out_txn_count",
        "net_flow_rm",
        "large_outflow_rm",
        "has_large_outflow",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            row = asdict(r)
            row["date"] = r.date.isoformat()
            writer.writerow(row)


def write_forecast_csv(rows: List[ForecastRow], path: Path) -> None:
    fieldnames = [
        "date",
        "weekday",
        "weekday_avg_inflow_rm",
        "momentum_multiplier",
        "calendar_multiplier",
        "calendar_reasons",
        "forecast_inflow_rm",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            row = asdict(r)
            row["date"] = r.date.isoformat()
            writer.writerow(row)


def write_holidays_csv(holidays: Dict[date, str], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "holiday_name"])
        writer.writeheader()
        for d, name in sorted(holidays.items()):
            writer.writerow({"date": d.isoformat(), "holiday_name": name})


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    years = sorted(
        {
            START_DATE.year,
            AS_OF_DATE.year,
            (AS_OF_DATE + timedelta(days=FORECAST_DAYS)).year,
        }
    )
    holidays: Dict[date, str] = {}
    for year in years:
        holidays.update(load_malaysia_holidays(year, STATE))

    txns = generate_mock_transactions(START_DATE, AS_OF_DATE, holidays)
    large_threshold = infer_large_outflow_threshold(txns)
    daily = aggregate_daily(txns, START_DATE, AS_OF_DATE, large_threshold)
    forecast, momentum = build_forecast(daily, AS_OF_DATE, holidays, FORECAST_DAYS)
    restock = infer_restock_pattern(daily)
    summary = demand_pressure_summary(daily, forecast, restock, CURRENT_BALANCE_RM)
    summary["large_outflow_threshold_rm"] = large_threshold
    summary["recent_momentum_multiplier"] = momentum
    calculation_details = build_calculation_details(
        txns=txns,
        daily=daily,
        forecast=forecast,
        restock=restock,
        summary=summary,
        holidays=holidays,
        current_balance_rm=CURRENT_BALANCE_RM,
        large_outflow_threshold=large_threshold,
        momentum=momentum,
        as_of=AS_OF_DATE,
    )
    summary["debug_calculation_details"] = calculation_details
    llm_summary = build_llm_summary(summary)
    summary["llm_interpretation"] = {
        "data_assumption": llm_summary["data_assumption"],
        "result": llm_summary["result"],
        "calculation_trace": llm_summary["calculation_trace"],
        "reason_codes": llm_summary["reason_codes"],
        "caveats": llm_summary["caveats"],
    }

    write_transactions_csv(txns, OUTPUT_DIR / "mock_wallet_transactions.csv")
    write_daily_csv(daily, OUTPUT_DIR / "daily_activity.csv")
    write_forecast_csv(forecast, OUTPUT_DIR / "forecast.csv")
    write_holidays_csv(holidays, OUTPUT_DIR / "holidays_loaded.csv")
    with (OUTPUT_DIR / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    with (OUTPUT_DIR / "calculation_details.json").open("w", encoding="utf-8") as f:
        json.dump(calculation_details, f, indent=2)
    with (OUTPUT_DIR / "llm_summary.json").open("w", encoding="utf-8") as f:
        json.dump(llm_summary, f, indent=2)

    print("\n=== MSME Demand Pressure Engine: Signed-Transaction-Only Demo ===")
    print(f"Input history columns:      datetime, amount_rm")
    print(f"Current balance input:      RM{CURRENT_BALANCE_RM:,.2f}")
    print(f"As-of date:                 {AS_OF_DATE.isoformat()}")
    print(f"Raw transactions generated: {len(txns):,}")
    print(f"Large OUT threshold:        RM{large_threshold:,.2f}")
    print(f"Recent momentum:            {momentum:.3f}x")
    print("---------------------------------------------------------------")
    print(f"Projected next 3-day IN:    RM{summary['projected_3_day_inflow_rm']:,.2f}")
    print(f"Typical large OUT:          RM{summary['typical_large_outflow_rm']:,.2f}")
    print(f"Last large OUT date:        {summary['last_large_outflow_date']}")
    print(f"Days since last large OUT:  {summary['days_since_last_large_outflow']}")
    print(f"Estimated cash gap:         RM{summary['estimated_cash_gap_rm']:,.2f}")
    print(f"Suggested BNPL top-up:      RM{summary['suggested_bnpl_topup_rm']:,.2f}")
    print(
        f"Demand pressure:            {summary['demand_pressure_score']}/100 ({summary['demand_pressure_label']})"
    )
    print(f"Confidence:                 {summary['confidence_score']}/100")
    print_calculation_details(calculation_details)
    print(f"\nFiles written to: {OUTPUT_DIR.resolve()}")
    print("- mock_wallet_transactions.csv  (raw mock input: datetime, amount_rm only)")
    print(
        "- daily_activity.csv            (derived daily IN/OUT features, no balance history)"
    )
    print("- forecast.csv                  (next-day inflow forecast)")
    print("- holidays_loaded.csv           (calendar context used)")
    print("- summary.json                  (final prediction + calculation context)")
    print("- calculation_details.json      (calculation context only)")
    print("- llm_summary.json              (compact reason-code payload for LLM use)")


if __name__ == "__main__":
    main()
