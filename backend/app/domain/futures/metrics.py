"""Price metrics for a futures contract, computed from daily bars.

Pure functions over a sequence of ``DailyBar`` (stdlib only, per the domain
layer rule). Lookbacks are in sessions, not calendar days, so holidays do
not shift them.
"""

from __future__ import annotations

import math
import statistics
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

SESSIONS_1W = 5
SESSIONS_1M = 21
SESSIONS_3M = 63
SESSIONS_52W = 252
SPARKLINE_SESSIONS = 63
VOL_WINDOW = 20


@dataclass(frozen=True)
class DailyBar:
    day: date
    close: float
    high: float | None = None
    low: float | None = None


@dataclass(frozen=True)
class FuturesMetrics:
    as_of: date
    last: float
    change_1d: float | None
    change_1w: float | None
    change_1m: float | None
    change_3m: float | None
    change_ytd: float | None
    high_52w: float | None
    low_52w: float | None
    from_high_52w: float | None
    from_low_52w: float | None
    sma_50: float | None
    sma_200: float | None
    trend: str | None
    realized_vol_20d: float | None
    sparkline: tuple[float, ...]


def _usable(value: float | None) -> bool:
    return value is not None and math.isfinite(value) and value > 0


def _pct(current: float, base: float | None) -> float | None:
    if base is None or base == 0:
        return None
    change = current / base - 1.0
    return change if math.isfinite(change) else None


def _close_sessions_ago(closes: Sequence[float], sessions: int) -> float | None:
    return closes[-1 - sessions] if len(closes) > sessions else None


def _mean_of_last(closes: Sequence[float], count: int) -> float | None:
    return statistics.fmean(closes[-count:]) if len(closes) >= count else None


def _trend(last: float, sma_50: float | None, sma_200: float | None) -> str | None:
    if sma_50 is None or sma_200 is None:
        return None
    if last > sma_50 > sma_200:
        return "up"
    if last < sma_50 < sma_200:
        return "down"
    return "mixed"


def compute_futures_metrics(bars: Sequence[DailyBar] | None) -> FuturesMetrics | None:
    """Return metrics for the latest bar, or None when there is no usable close."""
    usable = sorted((bar for bar in bars or () if _usable(bar.close)), key=lambda bar: bar.day)
    if not usable:
        return None

    closes = [bar.close for bar in usable]
    last = closes[-1]
    as_of = usable[-1].day

    prior_year = [bar.close for bar in usable if bar.day.year < as_of.year]
    year_base = prior_year[-1] if prior_year else None

    if len(usable) >= SESSIONS_52W:
        window = usable[-SESSIONS_52W:]
        highs = [bar.high if _usable(bar.high) else bar.close for bar in window]
        lows = [bar.low if _usable(bar.low) else bar.close for bar in window]
        high_52w = max(max(highs), last)
        low_52w = min(min(lows), last)
    else:
        high_52w = low_52w = None

    sma_50 = _mean_of_last(closes, 50)
    sma_200 = _mean_of_last(closes, 200)

    if len(closes) > VOL_WINDOW:
        recent = closes[-VOL_WINDOW - 1:]
        log_returns = [math.log(b / a) for a, b in zip(recent, recent[1:])]
        realized_vol = statistics.stdev(log_returns) * math.sqrt(252)
    else:
        realized_vol = None

    return FuturesMetrics(
        as_of=as_of,
        last=last,
        change_1d=_pct(last, _close_sessions_ago(closes, 1)),
        change_1w=_pct(last, _close_sessions_ago(closes, SESSIONS_1W)),
        change_1m=_pct(last, _close_sessions_ago(closes, SESSIONS_1M)),
        change_3m=_pct(last, _close_sessions_ago(closes, SESSIONS_3M)),
        change_ytd=_pct(last, year_base),
        high_52w=high_52w,
        low_52w=low_52w,
        from_high_52w=_pct(last, high_52w),
        from_low_52w=_pct(last, low_52w),
        sma_50=sma_50,
        sma_200=sma_200,
        trend=_trend(last, sma_50, sma_200),
        realized_vol_20d=realized_vol,
        sparkline=tuple(round(value, 6) for value in closes[-SPARKLINE_SESSIONS:]),
    )
