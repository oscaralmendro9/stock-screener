import math

import pandas as pd
import pytest

from app.domain.cot.models import PriceMappingKind
from app.domain.cot.registry import COT_INSTRUMENTS, instrument_by_slug
from app.domain.futures.contracts import (
    FUTURES_CONTRACTS,
    FuturesCategory,
    contract_by_symbol,
    normalize_futures_symbol,
)
from app.domain.futures.metrics import DailyBar, compute_futures_metrics
from app.infra.query.futures_prices import frame_to_bars


def _frame(closes, start="2025-01-02"):
    """Daily bars as the price cache stores them, read through the adapter."""
    return frame_to_bars(_dataframe(closes, start))


def _dataframe(closes, start="2025-01-02"):
    index = pd.bdate_range(start, periods=len(closes))
    closes = pd.Series(closes, index=index, dtype=float)
    return pd.DataFrame(
        {
            "Open": closes,
            "High": closes * 1.01,
            "Low": closes * 0.99,
            "Close": closes,
            "Volume": 1000,
        }
    )


# --- registry -------------------------------------------------------------


def test_every_cot_link_names_a_real_cot_instrument():
    for contract in FUTURES_CONTRACTS:
        if contract.cot_slug is not None:
            instrument_by_slug(contract.cot_slug)


def test_every_cot_exact_future_is_on_the_dashboard_with_its_positioning():
    linked = {contract.cot_slug: contract.symbol for contract in FUTURES_CONTRACTS}
    for instrument in COT_INSTRUMENTS:
        if instrument.price.kind is PriceMappingKind.EXACT_FUTURE:
            assert linked.get(instrument.slug) == instrument.price.yahoo_symbol


def test_every_category_has_contracts():
    used = {contract.category for contract in FUTURES_CONTRACTS}
    assert used == set(FuturesCategory)


@pytest.mark.parametrize("raw", ["es", "ES", " es=f ", "ES=F"])
def test_symbol_lookup_accepts_root_or_yahoo_form(raw):
    assert normalize_futures_symbol(raw) == "ES=F"
    assert contract_by_symbol(raw).name == "E-mini S&P 500"


def test_unknown_symbol_is_none():
    assert contract_by_symbol("AAPL") is None


# --- metrics --------------------------------------------------------------


def test_no_usable_close_gives_no_metrics():
    assert compute_futures_metrics(None) is None
    assert compute_futures_metrics([]) is None
    assert compute_futures_metrics(_frame([float("nan"), 0.0])) is None


def test_changes_count_sessions_back_from_the_last_bar():
    closes = [100.0 + i for i in range(300)]
    metrics = compute_futures_metrics(_frame(closes))

    last = closes[-1]
    assert metrics.last == last
    assert metrics.change_1d == pytest.approx(last / closes[-2] - 1)
    assert metrics.change_1w == pytest.approx(last / closes[-6] - 1)
    assert metrics.change_1m == pytest.approx(last / closes[-22] - 1)
    assert metrics.change_3m == pytest.approx(last / closes[-64] - 1)
    assert metrics.as_of == _dataframe(closes).index[-1].date()


def test_short_history_leaves_long_lookbacks_empty_instead_of_guessing():
    metrics = compute_futures_metrics(_frame([100.0, 101.0, 102.0]))

    assert metrics.change_1d == pytest.approx(102 / 101 - 1)
    assert metrics.change_1w is None
    assert metrics.high_52w is None
    assert metrics.sma_50 is None
    assert metrics.trend is None
    assert metrics.realized_vol_20d is None


def test_ytd_uses_the_last_close_of_the_prior_year():
    frame = _frame([50.0, 80.0, 100.0], start="2025-12-30")  # Dec 30, Dec 31, Jan 1
    metrics = compute_futures_metrics(frame)

    assert metrics.change_ytd == pytest.approx(100 / 80 - 1)


def test_ytd_is_empty_without_a_prior_year_close():
    metrics = compute_futures_metrics(_frame([100.0, 110.0], start="2026-01-05"))
    assert metrics.change_ytd is None


def test_trend_reads_close_against_both_moving_averages():
    rising = compute_futures_metrics(_frame([100.0 + i for i in range(260)]))
    falling = compute_futures_metrics(_frame([400.0 - i for i in range(260)]))
    choppy = compute_futures_metrics(_frame([100.0 + (i % 2) for i in range(260)]))

    assert rising.trend == "up"
    assert falling.trend == "down"
    assert choppy.trend == "mixed"


def test_52_week_range_uses_highs_and_lows():
    closes = [100.0] * 251 + [110.0]
    metrics = compute_futures_metrics(_frame(closes))

    assert metrics.high_52w == pytest.approx(110 * 1.01)
    assert metrics.low_52w == pytest.approx(99.0)
    assert metrics.from_high_52w == pytest.approx(110 / (110 * 1.01) - 1)


def test_realized_vol_is_annualized_from_the_last_20_log_returns():
    closes = [100.0]
    for i in range(30):
        closes.append(closes[-1] * (1.01 if i % 2 == 0 else 0.99))
    metrics = compute_futures_metrics(_frame(closes))

    series = pd.Series(closes)
    expected = (series / series.shift(1)).apply(math.log).iloc[-20:].std(ddof=1) * math.sqrt(252)
    assert metrics.realized_vol_20d == pytest.approx(expected)


def test_sparkline_holds_the_last_three_months_of_closes():
    closes = [100.0 + i for i in range(100)]
    metrics = compute_futures_metrics(_frame(closes))

    assert len(metrics.sparkline) == 63
    assert metrics.sparkline[-1] == closes[-1]


def test_unsorted_bars_are_read_in_date_order():
    metrics = compute_futures_metrics(list(reversed(_frame([100.0, 101.0, 105.0]))))

    assert metrics.last == 105.0
    assert metrics.change_1d == pytest.approx(105 / 101 - 1)


def test_adapter_keeps_missing_highs_and_lows_optional():
    frame = _dataframe([100.0, 101.0])
    frame.loc[frame.index[0], "High"] = float("nan")
    bars = frame_to_bars(frame.drop(columns=["Low"]))

    assert bars[0] == DailyBar(day=frame.index[0].date(), close=100.0, high=None, low=None)
    assert bars[1].high == pytest.approx(101.0 * 1.01)
    assert frame_to_bars(None) == []
