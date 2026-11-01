"""On-demand option chain and analytics for any optionable symbol.

Unlike the published Command Center cohort, this reads the provider in the
request path, so it caches per process: a chain for ``CHAIN_TTL`` and
expirations and the risk-free rate for longer. Spot is the latest cached
close when the price cache has one, else the provider's last price.

Mid-session: the cached close may be yesterday's while the chain is live;
``spot_source`` and ``fetched_at`` say which the numbers rest on.
"""

from __future__ import annotations

import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta, timezone

from app.domain.options_analytics.chain_view import (
    ChainRow,
    build_chain_rows,
    default_expiration,
)
from app.domain.options_analytics.metrics.aggregate import ChainMetrics, calculate_chain_metrics
from app.domain.options_analytics.ports import OptionsProvider, OptionsProviderError

CHAIN_TTL = timedelta(minutes=5)
EXPIRATIONS_TTL = timedelta(minutes=30)
RATE_TTL = timedelta(hours=6)
CLOSES_FOR_REALIZED_VOL = 30
# No dividend input on demand; the metrics carry this assumption.
DIVIDEND_YIELD = 0.0


class OptionsChainUnavailable(OptionsProviderError):
    """The symbol has no usable spot price or no listed expirations."""


class UnknownExpiration(ValueError):
    """The requested expiration is not listed for the symbol."""


@dataclass(frozen=True)
class OptionsChainView:
    symbol: str
    spot: float
    spot_source: str
    expirations: tuple[date, ...]
    expiration: date
    as_of: date
    days_to_expiration: int
    fetched_at: datetime
    risk_free_rate: float | None
    dividend_yield: float
    rows: tuple[ChainRow, ...]
    metrics: ChainMetrics


class _TtlCache:
    def __init__(self, clock: Callable[[], datetime]) -> None:
        self._clock = clock
        self._items: dict[object, tuple[datetime, object]] = {}
        self._lock = threading.Lock()

    def get_or_load(self, key, ttl: timedelta, load: Callable[[], object]):
        now = self._clock()
        with self._lock:
            hit = self._items.get(key)
            if hit is not None and now - hit[0] < ttl:
                return hit[1]
        # Loaded outside the lock: a slow provider call must not block other keys.
        value = load()
        with self._lock:
            self._items[key] = (now, value)
        return value


class OnDemandOptionsChain:
    def __init__(
        self,
        provider: OptionsProvider,
        closes_reader: Callable[[str], Sequence[float]],
        *,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        self._provider = provider
        self._closes_reader = closes_reader
        self._clock = clock
        self._cache = _TtlCache(clock)

    def _risk_free_rate(self, today: date) -> float | None:
        def load() -> float | None:
            try:
                return self._provider.risk_free_rate(today)
            except OptionsProviderError:
                # GEX and skew need a rate; the rest of the view does not.
                return None

        return self._cache.get_or_load(("rate", today), RATE_TTL, load)

    def execute(self, symbol: str, expiration: date | None = None) -> OptionsChainView:
        canonical = symbol.strip().upper()
        today = self._clock().date()
        expirations = tuple(
            sorted(
                self._cache.get_or_load(
                    ("expirations", canonical),
                    EXPIRATIONS_TTL,
                    lambda: tuple(self._provider.list_expirations(canonical)),
                )
            )
        )
        upcoming = tuple(day for day in expirations if day >= today)
        if not upcoming:
            raise OptionsChainUnavailable(f"{canonical} has no listed option expirations")
        if expiration is None:
            expiration = default_expiration(upcoming, today=today)
        elif expiration not in upcoming:
            raise UnknownExpiration(f"{expiration.isoformat()} is not listed for {canonical}")

        return self._cache.get_or_load(
            ("chain", canonical, expiration),
            CHAIN_TTL,
            lambda: self._build(canonical, expiration, upcoming, today),
        )

    def _build(
        self,
        symbol: str,
        expiration: date,
        expirations: tuple[date, ...],
        today: date,
    ) -> OptionsChainView:
        closes = tuple(float(value) for value in self._closes_reader(symbol))[-CLOSES_FOR_REALIZED_VOL:]
        cached_spot = closes[-1] if closes else None
        observation = self._provider.fetch_chain(
            symbol, expiration, source_spot_price=cached_spot or 0.0
        )
        if cached_spot:
            spot, spot_source = cached_spot, "cached_close"
        elif observation.provider_spot_price:
            spot, spot_source = observation.provider_spot_price, "provider"
        else:
            raise OptionsChainUnavailable(f"No spot price for {symbol}")
        observation = replace(observation, source_spot_price=float(spot))

        rate = self._risk_free_rate(today)
        time_years = (expiration - today).days / 365
        metrics = calculate_chain_metrics(
            observation,
            as_of_date=today,
            risk_free_rate=rate,
            dividend_yield=DIVIDEND_YIELD,
            closes=closes,
        )
        return OptionsChainView(
            symbol=symbol,
            spot=float(spot),
            spot_source=spot_source,
            expirations=expirations,
            expiration=expiration,
            as_of=today,
            days_to_expiration=(expiration - today).days,
            fetched_at=observation.fetched_at,
            risk_free_rate=rate,
            dividend_yield=DIVIDEND_YIELD,
            rows=build_chain_rows(
                observation.contracts,
                spot=float(spot),
                time_years=time_years,
                rate=rate,
                dividend_yield=DIVIDEND_YIELD,
            ),
            metrics=metrics,
        )
