"""Response contract for the on-demand option chain."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from app.domain.options_analytics.models import MetricValue
    from app.use_cases.options_analytics.on_demand import OptionsChainView


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ChainMetricResponse(_StrictModel):
    available: bool
    value: float | None
    reason_codes: list[str]

    @classmethod
    def from_metric(cls, metric: MetricValue) -> ChainMetricResponse:
        return cls(
            available=metric.available,
            value=metric.value,
            reason_codes=list(metric.reason_codes),
        )


class ContractQuoteResponse(_StrictModel):
    bid: float | None
    ask: float | None
    last: float | None
    volume: int | None
    open_interest: int | None
    implied_volatility: float | None
    delta: float | None


class ChainRowResponse(_StrictModel):
    strike: float
    call: ContractQuoteResponse | None
    put: ContractQuoteResponse | None


class OptionsChainResponse(_StrictModel):
    symbol: str
    spot: float
    spot_source: str
    expirations: list[date]
    expiration: date
    as_of: date
    days_to_expiration: int
    fetched_at: datetime
    risk_free_rate: float | None
    dividend_yield: float
    metrics: dict[str, ChainMetricResponse]
    gex_by_strike: list[tuple[float, float]]
    rows: list[ChainRowResponse]

    @classmethod
    def from_view(cls, view: OptionsChainView) -> OptionsChainResponse:
        metrics = view.metrics
        activity = metrics.activity
        named = {
            "max_pain": metrics.max_pain,
            "net_gex": metrics.net_gex,
            "gamma_flip": metrics.gamma_flip,
            "call_wall": metrics.call_wall,
            "put_wall": metrics.put_wall,
            "atm_iv": metrics.atm_iv,
            "skew_25_delta": metrics.skew_25_delta,
            "realized_volatility": metrics.realized_volatility,
            "vrp": metrics.vrp,
            "call_put_volume_ratio": activity.call_put_volume_ratio,
            "volume_oi_ratio": activity.volume_oi_ratio,
        }
        return cls(
            symbol=view.symbol,
            spot=view.spot,
            spot_source=view.spot_source,
            expirations=list(view.expirations),
            expiration=view.expiration,
            as_of=view.as_of,
            days_to_expiration=view.days_to_expiration,
            fetched_at=view.fetched_at,
            risk_free_rate=view.risk_free_rate,
            dividend_yield=view.dividend_yield,
            metrics={name: ChainMetricResponse.from_metric(value) for name, value in named.items()},
            gex_by_strike=[(strike, value) for strike, value in metrics.gex_by_strike],
            rows=[
                ChainRowResponse(
                    strike=row.strike,
                    call=ContractQuoteResponse(**row.call.__dict__) if row.call else None,
                    put=ContractQuoteResponse(**row.put.__dict__) if row.put else None,
                )
                for row in view.rows
            ],
        )
