"""Cache-only daily bars for the futures dashboard and on-demand option chains.

Adapts ``PriceCacheService`` frames (pandas) to the domain's ``DailyBar``
so the domain and use-case layers stay free of pandas. Never calls a price
provider.
"""

from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from app.domain.futures.metrics import DailyBar


def frame_to_bars(frame: pd.DataFrame | None) -> list[DailyBar]:
    if frame is None or frame.empty or "Close" not in frame:
        return []
    closes = pd.to_numeric(frame["Close"], errors="coerce")
    highs = pd.to_numeric(frame["High"], errors="coerce") if "High" in frame else None
    lows = pd.to_numeric(frame["Low"], errors="coerce") if "Low" in frame else None

    def optional(series, index):
        if series is None:
            return None
        value = series.iloc[index]
        return None if pd.isna(value) else float(value)

    bars = []
    for index, timestamp in enumerate(frame.index):
        close = closes.iloc[index]
        if pd.isna(close):
            continue
        bars.append(
            DailyBar(
                day=pd.Timestamp(timestamp).date(),
                close=float(close),
                high=optional(highs, index),
                low=optional(lows, index),
            )
        )
    return bars


class CachedFuturesBarsReader:
    def __init__(self, price_cache, period: str = "2y") -> None:
        self._price_cache = price_cache
        self._period = period

    def bars_many(self, symbols: Sequence[str]) -> dict[str, list[DailyBar]]:
        frames = self._price_cache.get_many_cached_only(list(symbols), period=self._period)
        return {symbol: frame_to_bars(frames.get(symbol)) for symbol in symbols}


def cached_closes(price_cache, symbol: str, period: str = "1y") -> list[float]:
    """Daily closes from the price cache only, oldest first; [] when uncached."""
    return [bar.close for bar in frame_to_bars(price_cache.get_cached_only(symbol, period=period))]
