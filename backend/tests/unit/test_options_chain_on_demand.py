from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException, Response

from app.domain.options_analytics.chain_view import (
    black_scholes_delta,
    build_chain_rows,
    default_expiration,
)
from app.domain.options_analytics.models import (
    ChainObservation,
    NormalizedOptionContract,
    OptionSide,
)
from app.domain.options_analytics.ports import (
    OptionsProviderError,
    ThrottledOptionsProviderError,
    TransientOptionsProviderError,
)
from app.use_cases.options_analytics.on_demand import (
    OnDemandOptionsChain,
    OptionsChainUnavailable,
    UnknownExpiration,
)

TODAY = date(2026, 10, 29)
NOW = datetime(2026, 10, 29, 15, 0, tzinfo=timezone.utc)
NOV = date(2026, 11, 20)
DEC = date(2026, 12, 18)


def contract(side, strike, *, iv=0.3, oi=100, volume=10, delta=None):
    return NormalizedOptionContract(
        side=side,
        strike=strike,
        bid=1.0,
        ask=1.2,
        last_price=1.1,
        volume=volume,
        open_interest=oi,
        implied_volatility=iv,
        last_trade_at=None,
        contract_size="REGULAR",
        multiplier=100,
        delta=delta,
    )


def chain_contracts():
    return tuple(
        contract(side, strike)
        for strike in (90.0, 95.0, 100.0, 105.0, 110.0)
        for side in (OptionSide.CALL, OptionSide.PUT)
    )


class FakeProvider:
    def __init__(self, *, expirations=(NOV, DEC), provider_spot=101.0, error=None, rate=0.04):
        self.expirations = expirations
        self.provider_spot = provider_spot
        self.error = error
        self.rate = rate
        self.calls = []

    def list_expirations(self, symbol):
        self.calls.append(("expirations", symbol))
        if self.error:
            raise self.error
        return self.expirations

    def fetch_chain(self, symbol, expiration, *, source_spot_price):
        self.calls.append(("chain", symbol, expiration, source_spot_price))
        return ChainObservation(
            symbol=symbol,
            expiration=expiration,
            source_spot_price=source_spot_price,
            provider_spot_price=self.provider_spot,
            fetched_at=NOW,
            contracts=chain_contracts(),
        )

    def risk_free_rate(self, on_or_before):
        self.calls.append(("rate", on_or_before))
        if self.rate is None:
            raise OptionsProviderError("no IRX")
        return self.rate


class Clock:
    def __init__(self):
        self.now = NOW

    def __call__(self):
        return self.now


def service(provider=None, closes=(98.0, 99.0, 100.0), clock=None):
    return OnDemandOptionsChain(provider or FakeProvider(), lambda _symbol: closes, clock=clock or Clock())


# --- domain ---------------------------------------------------------------


def test_delta_matches_black_scholes_symmetry():
    kwargs = dict(spot=100.0, strike=100.0, time_years=0.25, rate=0.0, dividend_yield=0.0, volatility=0.2)
    call = black_scholes_delta(OptionSide.CALL, **kwargs)
    put = black_scholes_delta(OptionSide.PUT, **kwargs)

    assert call == pytest.approx(0.5199, abs=1e-4)
    assert call - put == pytest.approx(1.0)
    assert black_scholes_delta(OptionSide.CALL, **{**kwargs, "volatility": 0.0}) is None


def test_rows_pair_calls_and_puts_by_strike_and_keep_the_deeper_duplicate():
    rows = build_chain_rows(
        (
            contract(OptionSide.PUT, 100.0, oi=5),
            contract(OptionSide.CALL, 100.0, delta=0.55),
            contract(OptionSide.PUT, 100.0, oi=50, iv=0.4),
            contract(OptionSide.CALL, 95.0, iv=None),
        ),
        spot=100.0,
        time_years=0.1,
        rate=0.04,
        dividend_yield=0.0,
    )

    assert [row.strike for row in rows] == [95.0, 100.0]
    assert rows[0].put is None
    assert rows[0].call.implied_volatility is None and rows[0].call.delta is None
    assert rows[1].call.delta == 0.55
    assert rows[1].put.open_interest == 50
    assert -1 < rows[1].put.delta < 0


def test_default_expiration_skips_the_next_few_days():
    days = (date(2026, 10, 30), NOV, DEC)
    assert default_expiration(days, today=TODAY) == NOV
    assert default_expiration((date(2026, 10, 30),), today=TODAY) == date(2026, 10, 30)
    assert default_expiration((), today=TODAY) is None


# --- use case -------------------------------------------------------------


def test_chain_uses_cached_close_as_spot_and_computes_metrics():
    provider = FakeProvider()
    view = service(provider).execute(" nvda ")

    assert view.symbol == "NVDA"
    assert (view.spot, view.spot_source) == (100.0, "cached_close")
    assert view.expiration == NOV
    assert view.days_to_expiration == (NOV - TODAY).days
    assert view.risk_free_rate == 0.04
    assert len(view.rows) == 5
    assert view.metrics.max_pain.available
    assert view.metrics.net_gex.available
    assert ("chain", "NVDA", NOV, 100.0) in provider.calls


def test_chain_falls_back_to_the_provider_price_without_a_cached_close():
    view = service(FakeProvider(provider_spot=250.0), closes=()).execute("XYZ")

    assert (view.spot, view.spot_source) == (250.0, "provider")


def test_no_spot_at_all_is_unavailable():
    with pytest.raises(OptionsChainUnavailable):
        service(FakeProvider(provider_spot=None), closes=()).execute("XYZ")


def test_missing_rate_keeps_the_chain_but_not_rate_based_metrics():
    view = service(FakeProvider(rate=None)).execute("NVDA")

    assert view.risk_free_rate is None
    assert not view.metrics.net_gex.available
    assert view.metrics.max_pain.available


def test_unknown_expiration_and_no_expirations_are_distinct_errors():
    with pytest.raises(UnknownExpiration):
        service().execute("NVDA", date(2027, 1, 15))
    with pytest.raises(OptionsChainUnavailable):
        service(FakeProvider(expirations=(date(2026, 1, 16),))).execute("NVDA")


def test_chain_is_cached_for_five_minutes():
    provider = FakeProvider()
    clock = Clock()
    chain = service(provider, clock=clock)

    chain.execute("NVDA", DEC)
    chain.execute("NVDA", DEC)
    assert sum(call[0] == "chain" for call in provider.calls) == 1

    clock.now += timedelta(minutes=6)
    chain.execute("NVDA", DEC)
    assert sum(call[0] == "chain" for call in provider.calls) == 2
    assert sum(call[0] == "expirations" for call in provider.calls) == 1


def test_failed_loads_are_not_cached():
    provider = FakeProvider(error=TransientOptionsProviderError("timeout"))
    chain = service(provider)

    for _ in range(2):
        with pytest.raises(TransientOptionsProviderError):
            chain.execute("NVDA")
    assert sum(call[0] == "expirations" for call in provider.calls) == 2


# --- route ----------------------------------------------------------------


def test_route_serializes_the_chain(monkeypatch):
    from app.api.v1 import options_chain as module

    monkeypatch.setattr(module, "get_on_demand_options_chain", lambda: service())
    response = Response()

    payload = module.get_options_chain("nvda", response=response, expiration=None)

    assert payload.symbol == "NVDA"
    assert payload.expirations == [NOV, DEC]
    assert payload.metrics["max_pain"].available
    assert payload.rows[2].strike == 100.0
    assert payload.rows[2].call.delta is not None
    assert response.headers["Cache-Control"] == "private, max-age=60"


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (ThrottledOptionsProviderError("429"), 429, "options_provider_throttled"),
        (TransientOptionsProviderError("timeout"), 503, "options_provider_unavailable"),
        (OptionsProviderError("no options"), 404, "options_chain_unavailable"),
    ],
)
def test_route_maps_provider_errors_to_stable_codes(monkeypatch, error, status, code):
    from app.api.v1 import options_chain as module

    monkeypatch.setattr(module, "get_on_demand_options_chain", lambda: service(FakeProvider(error=error)))

    with pytest.raises(HTTPException) as raised:
        module.get_options_chain("NVDA", response=Response(), expiration=None)

    assert raised.value.status_code == status
    assert raised.value.detail["code"] == code


@pytest.mark.parametrize(("symbol", "expiration", "code"), [("NV DA", None, "invalid_symbol"), ("NVDA", date(2027, 1, 15), "expiration_not_listed")])
def test_route_rejects_bad_input(monkeypatch, symbol, expiration, code):
    from app.api.v1 import options_chain as module

    monkeypatch.setattr(module, "get_on_demand_options_chain", lambda: service())

    with pytest.raises(HTTPException) as raised:
        module.get_options_chain(symbol, response=Response(), expiration=expiration)

    assert raised.value.status_code == 422
    assert raised.value.detail["code"] == code


def test_route_is_registered():
    from app.api.v1.router import router

    assert "/options/{symbol}/chain" in {route.path for route in router.routes}
