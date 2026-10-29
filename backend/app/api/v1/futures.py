"""Futures dashboard routes. Reads are cache-only; refresh is queued."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.domain.futures.contracts import CATEGORY_LABELS, FUTURES_CONTRACTS, contract_by_symbol
from app.schemas.futures import (
    FuturesContractListItem,
    FuturesDashboardResponse,
    FuturesHistoryResponse,
    FuturesRefreshResponse,
)
from app.wiring.bootstrap import get_futures_dashboard_query, get_price_cache

from ._price_history import PERIOD_DAYS, dataframe_to_points

router = APIRouter()

HistoryPeriod = Literal["3mo", "6mo", "1y", "2y"]


@router.get("", response_model=FuturesDashboardResponse)
def get_futures_dashboard(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> FuturesDashboardResponse:
    response.headers["Cache-Control"] = "private, no-cache"
    return FuturesDashboardResponse.from_view(get_futures_dashboard_query(db).execute())


@router.get("/contracts", response_model=list[FuturesContractListItem])
def list_futures_contracts() -> list[FuturesContractListItem]:
    """The tracked contracts, for symbol search. Static; no price data."""
    return [
        FuturesContractListItem(
            symbol=contract.symbol,
            root=contract.root,
            name=contract.name,
            exchange=contract.exchange,
            category=contract.category.value,
            category_label=CATEGORY_LABELS[contract.category],
        )
        for contract in FUTURES_CONTRACTS
    ]


@router.get("/{symbol}/history", response_model=FuturesHistoryResponse)
def get_futures_history(
    symbol: str,
    period: Annotated[HistoryPeriod, Query()] = "1y",
) -> FuturesHistoryResponse:
    contract = contract_by_symbol(symbol)
    if contract is None:
        raise HTTPException(status_code=404, detail={"code": "futures_contract_unknown"})
    frame = get_price_cache().get_cached_only(contract.symbol, period="2y")
    bars = dataframe_to_points(frame, PERIOD_DAYS[period])
    if not bars:
        raise HTTPException(status_code=404, detail={"code": "futures_prices_unavailable"})
    return FuturesHistoryResponse(
        symbol=contract.symbol,
        name=contract.name,
        exchange=contract.exchange,
        category=contract.category.value,
        cot_slug=contract.cot_slug,
        period=period,
        bars=bars,
    )


@router.post("/refresh", response_model=FuturesRefreshResponse, status_code=202)
def queue_futures_refresh() -> FuturesRefreshResponse:
    from app.interfaces.tasks.futures_tasks import refresh_futures

    task = refresh_futures.apply_async(kwargs={"origin": "manual"})
    return FuturesRefreshResponse(status="queued", task_id=task.id)
