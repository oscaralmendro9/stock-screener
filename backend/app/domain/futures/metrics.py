"""Price metrics for a futures contract, computed from daily OHLCV bars.

Pure functions over a pandas frame (``Close`` required; ``High``/``Low``
used for the 52-week range when present). Lookbacks are in sessions, not
calendar days, so holidays do not shift them.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import pandas as pd

SESSIONS_1W = 5
SESSIONS_1M = 21
SESSIONS_3M = 63
SESSIONS_52W = 252
SPARKLINE_SESSIONS = 63
VOL_WINDOW = 20


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


def _finite(value) -> float | None:
    if value is None:
        return None
    value = float(value)
    return value if math.isfinite(value) else None


def _pct(current: float, base: float | None) -> float | None:
    if base is None or base == 0:
        return None
    return _finite(current / base - 1.0)


def _close_sessions_ago(closes: pd.Series, sessions: int) -> float | None:
    if len(closes) <= sessions:
        return None
    return _finite(closes.iloc[-1 - sessions])


def _trend(last: float, sma_50: float | None, sma_200: float | None) -> str | None:
    if sma_50 is None or sma_200 is None:
        return None
    if last > sma_50 > sma_200:
        return "up"
    if last < sma_50 < sma_200:
        return "down"
    return "mixed"


def compute_futures_metrics(frame: pd.DataFrame | None) -> FuturesMetrics | None:
    """Return metrics for the latest bar, or None when there is no usable close."""
    if frame is None or frame.empty or "Close" not in frame:
        return None
    data = frame.sort_index()
    closes = pd.to_numeric(data["Close"], errors="coerce").dropna()
    closes = closes[closes > 0]
    if closes.empty:
        return None

    last = float(closes.iloc[-1])
    last_ts = pd.Timestamp(closes.index[-1])
    as_of = last_ts.date()

    prior_year = closes[[ts.year < last_ts.year for ts in pd.DatetimeIndex(closes.index)]]
    year_base = _finite(prior_year.iloc[-1]) if not prior_year.empty else None

    window = data.loc[closes.index[-SESSIONS_52W:]]
    if len(closes) >= SESSIONS_52W:
        highs = pd.to_numeric(window["High"], errors="coerce") if "High" in window else closes[-SESSIONS_52W:]
        lows = pd.to_numeric(window["Low"], errors="coerce") if "Low" in window else closes[-SESSIONS_52W:]
        high_52w = _finite(max(highs.max(), last))
        low_52w = _finite(min(lows[lows > 0].min(), last))
    else:
        high_52w = low_52w = None

    sma_50 = _finite(closes.iloc[-50:].mean()) if len(closes) >= 50 else None
    sma_200 = _finite(closes.iloc[-200:].mean()) if len(closes) >= 200 else None

    if len(closes) > VOL_WINDOW:
        log_returns = (closes / closes.shift(1)).apply(math.log).iloc[-VOL_WINDOW:]
        realized_vol = _finite(log_returns.std(ddof=1) * math.sqrt(252))
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
        sparkline=tuple(round(float(value), 6) for value in closes.iloc[-SPARKLINE_SESSIONS:]),
    )
