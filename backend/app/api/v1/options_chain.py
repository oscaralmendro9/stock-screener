"""On-demand option chain for any optionable symbol (reads the provider)."""

from __future__ import annotations

import re
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response

from app.domain.options_analytics.ports import (
    OptionsProviderError,
    ThrottledOptionsProviderError,
    TransientOptionsProviderError,
)
from app.schemas.options_chain import OptionsChainResponse
from app.use_cases.options_analytics.on_demand import UnknownExpiration
from app.wiring.bootstrap import get_on_demand_options_chain

router = APIRouter()

_SYMBOL = re.compile(r"^[A-Z0-9.\-^]{1,15}$")


def _error(status: int, code: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code})


@router.get("/{symbol}/chain", response_model=OptionsChainResponse)
def get_options_chain(
    symbol: str,
    response: Response,
    expiration: Annotated[date | None, Query()] = None,
) -> OptionsChainResponse:
    canonical = symbol.strip().upper()
    if not _SYMBOL.match(canonical):
        raise _error(422, "invalid_symbol")
    try:
        view = get_on_demand_options_chain().execute(canonical, expiration)
    except UnknownExpiration as exc:
        raise _error(422, "expiration_not_listed") from exc
    except ThrottledOptionsProviderError as exc:
        raise _error(429, "options_provider_throttled") from exc
    except TransientOptionsProviderError as exc:
        raise _error(503, "options_provider_unavailable") from exc
    except OptionsProviderError as exc:
        # No listed options, an empty chain, or no spot price.
        raise _error(404, "options_chain_unavailable") from exc
    # The server caches a chain for a few minutes; let the browser reuse it briefly.
    response.headers["Cache-Control"] = "private, max-age=60"
    return OptionsChainResponse.from_view(view)
