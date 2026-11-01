"""Write side of the futures dashboard: top up cached daily bars.

Each contract goes through ``PriceCacheService.get_historical_data``, which
serves fresh cache, fetches only missing dates when stale, and fetches full
history on a miss. One failing symbol is recorded and the rest continue.

Mid-session: a fetch during the US session stores a partial bar for today;
the price cache marks it and refreshes it after the close, so the scheduled
run after the close settles it.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from dataclasses import dataclass, field

from app.domain.futures.contracts import FUTURES_CONTRACTS, FuturesContract

logger = logging.getLogger(__name__)

REFRESH_PERIOD = "2y"
# Futures are US-listed; the US calendar decides freshness.
PRICE_MARKET = "US"


@dataclass
class FuturesRefreshResult:
    refreshed: list[str] = field(default_factory=list)
    empty: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "status": "completed" if not self.failed else "partial",
            "refreshed_count": len(self.refreshed),
            "empty": self.empty,
            "failed": self.failed,
        }


class RefreshFuturesPrices:
    def __init__(self, price_cache, contracts: Iterable[FuturesContract] = FUTURES_CONTRACTS) -> None:
        self._price_cache = price_cache
        self._contracts = tuple(contracts)

    def execute(self) -> FuturesRefreshResult:
        result = FuturesRefreshResult()
        for contract in self._contracts:
            try:
                frame = self._price_cache.get_historical_data(
                    contract.symbol,
                    period=REFRESH_PERIOD,
                    market=PRICE_MARKET,
                )
            except Exception as exc:  # one provider error must not stop the batch
                logger.warning("Futures price refresh failed for %s", contract.symbol, exc_info=True)
                result.failed[contract.symbol] = type(exc).__name__
                continue
            if frame is None or frame.empty:
                result.empty.append(contract.symbol)
            else:
                result.refreshed.append(contract.symbol)
        return result
