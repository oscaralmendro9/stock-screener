"""Strike-by-strike option chain rows for the on-demand chain view.

Pure functions (stdlib only). Delta uses the provider's value when present,
otherwise Black-Scholes with the contract's implied volatility.
"""

from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass

from .models import NormalizedOptionContract, OptionSide


def _normal_cdf(value: float) -> float:
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def black_scholes_delta(
    side: OptionSide,
    *,
    spot: float,
    strike: float,
    time_years: float,
    rate: float,
    dividend_yield: float,
    volatility: float,
) -> float | None:
    """Spot delta, or None when an input is missing or not positive."""
    values = (spot, strike, time_years, rate, dividend_yield, volatility)
    if not all(value is not None and math.isfinite(float(value)) for value in values):
        return None
    if spot <= 0 or strike <= 0 or time_years <= 0 or volatility <= 0:
        return None
    sqrt_time = math.sqrt(time_years)
    d1 = (
        math.log(spot / strike)
        + (rate - dividend_yield + volatility * volatility / 2) * time_years
    ) / (volatility * sqrt_time)
    carry = math.exp(-dividend_yield * time_years)
    if side is OptionSide.CALL:
        return carry * _normal_cdf(d1)
    return carry * (_normal_cdf(d1) - 1.0)


@dataclass(frozen=True)
class ContractQuote:
    bid: float | None
    ask: float | None
    last: float | None
    volume: int | None
    open_interest: int | None
    implied_volatility: float | None
    delta: float | None


@dataclass(frozen=True)
class ChainRow:
    strike: float
    call: ContractQuote | None
    put: ContractQuote | None


def _usable_iv(value: float | None) -> float | None:
    return float(value) if value is not None and math.isfinite(value) and value > 0 else None


def build_chain_rows(
    contracts: Iterable[NormalizedOptionContract],
    *,
    spot: float,
    time_years: float,
    rate: float | None,
    dividend_yield: float,
) -> tuple[ChainRow, ...]:
    """One row per strike, calls and puts side by side, ascending strike.

    Duplicate contracts for the same side and strike keep the one with the
    larger open interest, as the chain view shows a single quote per cell.
    """
    best: dict[tuple[float, OptionSide], NormalizedOptionContract] = {}
    for contract in contracts:
        key = (contract.strike, contract.side)
        current = best.get(key)
        if current is None or (contract.open_interest or 0) > (current.open_interest or 0):
            best[key] = contract

    def quote(contract: NormalizedOptionContract | None) -> ContractQuote | None:
        if contract is None:
            return None
        iv = _usable_iv(contract.implied_volatility)
        delta = contract.delta
        if delta is None and iv is not None and rate is not None:
            delta = black_scholes_delta(
                contract.side,
                spot=spot,
                strike=contract.strike,
                time_years=time_years,
                rate=rate,
                dividend_yield=dividend_yield,
                volatility=iv,
            )
        return ContractQuote(
            bid=contract.bid,
            ask=contract.ask,
            last=contract.last_price,
            volume=contract.volume,
            open_interest=contract.open_interest,
            implied_volatility=iv,
            delta=delta,
        )

    strikes = sorted({strike for strike, _ in best})
    return tuple(
        ChainRow(
            strike=strike,
            call=quote(best.get((strike, OptionSide.CALL))),
            put=quote(best.get((strike, OptionSide.PUT))),
        )
        for strike in strikes
    )


def default_expiration(expirations: Iterable, *, today, min_days: int = 7):
    """The nearest expiration at least ``min_days`` out, else the nearest one."""
    ordered = sorted(day for day in expirations if day >= today)
    for day in ordered:
        if (day - today).days >= min_days:
            return day
    return ordered[0] if ordered else None
