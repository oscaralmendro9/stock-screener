"""Response contracts for the futures dashboard."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from app.use_cases.futures.dashboard import FuturesDashboardView, FuturesRow


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class FuturesMetricsResponse(_StrictModel):
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
    trend: Literal["up", "down", "mixed"] | None
    realized_vol_20d: float | None
    sparkline: list[float]


class FuturesCotResponse(_StrictModel):
    slug: str
    participant_label: str
    report_date: date
    net: int
    net_pct_open_interest: float | None
    percentile_3y: float | None


class FuturesContractResponse(_StrictModel):
    symbol: str
    root: str
    name: str
    exchange: str
    category: str
    cot_slug: str | None
    metrics: FuturesMetricsResponse | None
    cot: FuturesCotResponse | None

    @classmethod
    def from_row(cls, row: FuturesRow) -> FuturesContractResponse:
        contract = row.contract
        metrics = row.metrics
        return cls(
            symbol=contract.symbol,
            root=contract.root,
            name=contract.name,
            exchange=contract.exchange,
            category=contract.category.value,
            cot_slug=contract.cot_slug,
            metrics=(
                FuturesMetricsResponse(
                    **{
                        **metrics.__dict__,
                        "sparkline": list(metrics.sparkline),
                    }
                )
                if metrics is not None
                else None
            ),
            cot=FuturesCotResponse(**row.cot.__dict__) if row.cot is not None else None,
        )


class FuturesCategoryResponse(_StrictModel):
    id: str
    label: str
    contracts: list[FuturesContractResponse]


class FuturesDashboardResponse(_StrictModel):
    as_of: date | None
    cot_report_date: date | None
    missing_symbols: list[str]
    categories: list[FuturesCategoryResponse]

    @classmethod
    def from_view(cls, view: FuturesDashboardView) -> FuturesDashboardResponse:
        return cls(
            as_of=view.as_of,
            cot_report_date=view.cot_report_date,
            missing_symbols=list(view.missing_symbols),
            categories=[
                FuturesCategoryResponse(
                    id=category.category.value,
                    label=category.label,
                    contracts=[FuturesContractResponse.from_row(row) for row in category.rows],
                )
                for category in view.categories
            ],
        )


class FuturesPricePoint(_StrictModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class FuturesHistoryResponse(_StrictModel):
    symbol: str
    name: str
    exchange: str
    category: str
    cot_slug: str | None
    period: str
    bars: list[FuturesPricePoint]


class FuturesContractListItem(_StrictModel):
    symbol: str
    root: str
    name: str
    exchange: str
    category: str
    category_label: str


class FuturesRefreshResponse(_StrictModel):
    status: Literal["queued"]
    task_id: str
