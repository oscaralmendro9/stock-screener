"""Read side of the futures dashboard: cached prices plus COT positioning.

Never calls a price provider. Contracts with no cached bars are listed with
``metrics=None`` so the page can say prices are still loading; the refresh
task (``refresh.py``) fills them.

Mid-session: a cached bar written during the session is a partial bar for
today. Futures trade nearly around the clock, so ``as_of`` is reported per
contract and the dashboard shows it rather than implying a settled close.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date
from typing import Protocol

from app.domain.futures.contracts import (
    CATEGORY_LABELS,
    FUTURES_CONTRACTS,
    FuturesCategory,
    FuturesContract,
)
from app.domain.futures.metrics import DailyBar, FuturesMetrics, compute_futures_metrics


class FuturesBarsReader(Protocol):
    """Cached daily bars per symbol; must not call a price provider."""

    def bars_many(self, symbols: Sequence[str]) -> Mapping[str, Sequence[DailyBar]]: ...


@dataclass(frozen=True)
class CotPositioning:
    slug: str
    participant_label: str
    report_date: date
    net: int
    net_pct_open_interest: float | None
    percentile_3y: float | None


@dataclass(frozen=True)
class FuturesRow:
    contract: FuturesContract
    metrics: FuturesMetrics | None
    cot: CotPositioning | None


@dataclass(frozen=True)
class FuturesCategoryView:
    category: FuturesCategory
    label: str
    rows: tuple[FuturesRow, ...]


@dataclass(frozen=True)
class FuturesDashboardView:
    as_of: date | None
    categories: tuple[FuturesCategoryView, ...]
    missing_symbols: tuple[str, ...]
    cot_report_date: date | None


class FuturesDashboardQuery:
    def __init__(
        self,
        bars_reader: FuturesBarsReader,
        cot_positioning: Callable[[], Mapping[str, CotPositioning]] | None = None,
        contracts: Iterable[FuturesContract] = FUTURES_CONTRACTS,
    ) -> None:
        self._bars_reader = bars_reader
        self._cot_positioning = cot_positioning
        self._contracts = tuple(contracts)

    def execute(self) -> FuturesDashboardView:
        bars = self._bars_reader.bars_many([contract.symbol for contract in self._contracts])
        positioning = self._cot_positioning() if self._cot_positioning else {}

        rows_by_category: dict[FuturesCategory, list[FuturesRow]] = {}
        missing: list[str] = []
        for contract in self._contracts:
            metrics = compute_futures_metrics(bars.get(contract.symbol))
            if metrics is None:
                missing.append(contract.symbol)
            rows_by_category.setdefault(contract.category, []).append(
                FuturesRow(
                    contract=contract,
                    metrics=metrics,
                    cot=positioning.get(contract.cot_slug) if contract.cot_slug else None,
                )
            )

        as_of_dates = [
            row.metrics.as_of
            for rows in rows_by_category.values()
            for row in rows
            if row.metrics is not None
        ]
        cot_dates = [item.report_date for item in positioning.values()]
        return FuturesDashboardView(
            as_of=max(as_of_dates) if as_of_dates else None,
            categories=tuple(
                FuturesCategoryView(
                    category=category,
                    label=CATEGORY_LABELS[category],
                    rows=tuple(rows_by_category[category]),
                )
                for category in FuturesCategory
                if category in rows_by_category
            ),
            missing_symbols=tuple(missing),
            cot_report_date=max(cot_dates) if cot_dates else None,
        )
