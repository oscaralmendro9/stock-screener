from datetime import date
from types import SimpleNamespace

import pandas as pd
import pytest
from fastapi import HTTPException, Response

from app.domain.futures.contracts import contract_by_symbol
from app.use_cases.futures.dashboard import CotPositioning, FuturesDashboardQuery
from app.use_cases.futures.refresh import RefreshFuturesPrices


def _frame(closes, start="2025-01-02"):
    index = pd.bdate_range(start, periods=len(closes))
    series = pd.Series(closes, index=index, dtype=float)
    return pd.DataFrame(
        {"Open": series, "High": series, "Low": series, "Close": series, "Volume": 10}
    )


class FakeCache:
    def __init__(self, frames=None, failing=()):
        self.frames = frames or {}
        self.failing = set(failing)
        self.fetched = []

    def get_many_cached_only(self, symbols, period="2y"):
        assert period == "2y"
        return {symbol: self.frames.get(symbol) for symbol in symbols}

    def get_cached_only(self, symbol, period="2y"):
        return self.frames.get(symbol)

    def get_historical_data(self, symbol, period="2y", market=None, force_refresh=False):
        self.fetched.append((symbol, period, market))
        if symbol in self.failing:
            raise TimeoutError("provider timeout")
        return self.frames.get(symbol)


ES = contract_by_symbol("ES")
GC = contract_by_symbol("GC")
ZT = contract_by_symbol("ZT")


# --- dashboard query ------------------------------------------------------


def test_dashboard_groups_contracts_and_lists_the_ones_still_loading():
    cache = FakeCache({"ES=F": _frame([100.0, 102.0]), "GC=F": _frame([10.0, 9.0], start="2025-01-03")})
    view = FuturesDashboardQuery(cache, contracts=(ES, GC, ZT)).execute()

    assert [category.category.value for category in view.categories] == ["equity_index", "rates", "metals"]
    rows = {row.contract.symbol: row for category in view.categories for row in category.rows}
    assert rows["ES=F"].metrics.change_1d == pytest.approx(0.02)
    assert rows["ZT=F"].metrics is None
    assert view.missing_symbols == ("ZT=F",)
    assert view.as_of == date(2025, 1, 6)


def test_dashboard_attaches_cot_positioning_by_slug_only_where_linked():
    positioning = CotPositioning(
        slug="sp-500",
        participant_label="Leveraged Funds",
        report_date=date(2025, 1, 7),
        net=-12000,
        net_pct_open_interest=-5.5,
        percentile_3y=18.0,
    )
    cache = FakeCache({"ES=F": _frame([1.0, 2.0]), "ZT=F": _frame([1.0, 2.0])})
    view = FuturesDashboardQuery(
        cache, cot_positioning=lambda: {"sp-500": positioning}, contracts=(ES, ZT)
    ).execute()

    rows = {row.contract.symbol: row for category in view.categories for row in category.rows}
    assert rows["ES=F"].cot is positioning
    assert rows["ZT=F"].cot is None
    assert view.cot_report_date == date(2025, 1, 7)


def test_empty_cache_gives_an_empty_dashboard_not_an_error():
    view = FuturesDashboardQuery(FakeCache(), contracts=(ES, GC)).execute()

    assert view.as_of is None
    assert view.missing_symbols == ("ES=F", "GC=F")


# --- refresh --------------------------------------------------------------


def test_refresh_fetches_every_contract_with_the_us_calendar_and_survives_failures():
    cache = FakeCache({"ES=F": _frame([1.0, 2.0])}, failing={"GC=F"})
    result = RefreshFuturesPrices(cache, contracts=(ES, GC, ZT)).execute()

    assert [call[0] for call in cache.fetched] == ["ES=F", "GC=F", "ZT=F"]
    assert {call[2] for call in cache.fetched} == {"US"}
    assert result.refreshed == ["ES=F"]
    assert result.empty == ["ZT=F"]
    assert result.failed == {"GC=F": "TimeoutError"}
    assert result.as_dict()["status"] == "partial"


def test_futures_task_runs_the_refresh_in_process(monkeypatch):
    from app.interfaces.tasks import futures_tasks as module
    from app.tasks.data_fetch_lock import disable_serialized_data_fetch_lock

    cache = FakeCache({"ES=F": _frame([1.0, 2.0])})
    monkeypatch.setattr(
        module,
        "get_refresh_futures_use_case",
        lambda: RefreshFuturesPrices(cache, contracts=(ES,)),
    )

    with disable_serialized_data_fetch_lock():
        result = module.refresh_futures.run(origin="manual")

    assert result == {
        "origin": "manual",
        "status": "completed",
        "refreshed_count": 1,
        "empty": [],
        "failed": {},
    }


# --- routes ---------------------------------------------------------------


def test_dashboard_route_serializes_metrics_and_requires_revalidation(monkeypatch):
    from app.api.v1 import futures as module

    cache = FakeCache({"ES=F": _frame([100.0 + i for i in range(80)])})
    monkeypatch.setattr(
        module,
        "get_futures_dashboard_query",
        lambda _db: FuturesDashboardQuery(cache, contracts=(ES, ZT)),
    )
    response = Response()

    payload = module.get_futures_dashboard(response=response, db=object())

    assert response.headers["Cache-Control"] == "private, no-cache"
    es = payload.categories[0].contracts[0]
    assert es.symbol == "ES=F"
    assert es.cot_slug == "sp-500"
    assert len(es.metrics.sparkline) == 63
    assert payload.missing_symbols == ["ZT=F"]


def test_history_route_accepts_the_root_symbol(monkeypatch):
    from app.api.v1 import futures as module

    monkeypatch.setattr(module, "get_price_cache", lambda: FakeCache({"GC=F": _frame([10.0, 11.0], start=str(date.today() - pd.Timedelta(days=5)))}))

    payload = module.get_futures_history("gc", period="1y")

    assert payload.symbol == "GC=F"
    assert payload.name == "Gold"
    assert [bar.close for bar in payload.bars] == [10.0, 11.0]


@pytest.mark.parametrize(
    ("symbol", "frames", "code"),
    [
        ("AAPL", {}, "futures_contract_unknown"),
        ("GC", {}, "futures_prices_unavailable"),
    ],
)
def test_history_route_returns_stable_404_codes(monkeypatch, symbol, frames, code):
    from app.api.v1 import futures as module

    monkeypatch.setattr(module, "get_price_cache", lambda: FakeCache(frames))

    with pytest.raises(HTTPException) as error:
        module.get_futures_history(symbol, period="1y")

    assert error.value.status_code == 404
    assert error.value.detail["code"] == code


def test_refresh_route_queues_the_task():
    from app.api.v1 import futures as module

    payload = module.queue_futures_refresh()

    assert payload.status == "queued"
    assert "futures_tasks.refresh_futures" in payload.task_id


def test_futures_routes_are_registered_on_protected_v1_router():
    from app.api.v1.router import router

    paths = {route.path for route in router.routes}
    assert {
        "/futures",
        "/futures/contracts",
        "/futures/{symbol}/history",
        "/futures/refresh",
    } <= paths


def test_contracts_route_lists_the_registry_for_search():
    from app.api.v1 import futures as module
    from app.domain.futures.contracts import FUTURES_CONTRACTS

    items = module.list_futures_contracts()

    assert len(items) == len(FUTURES_CONTRACTS)
    gold = next(item for item in items if item.root == "GC")
    assert (gold.name, gold.category_label) == ("Gold", "Metals")


def test_cot_positioning_is_empty_until_a_publication_exists(monkeypatch):
    from app.use_cases.cot.queries import CotPublicationUnavailable
    from app.wiring import use_case_factories as module

    def unavailable():
        raise CotPublicationUnavailable("none")

    monkeypatch.setattr(module, "get_cot_queries", lambda _session: SimpleNamespace(snapshot=unavailable))

    assert module._cot_positioning_by_slug(object()) == {}
