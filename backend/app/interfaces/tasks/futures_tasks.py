"""Celery delivery boundary for the futures dashboard price refresh."""

from __future__ import annotations

from app.celery_app import celery_app
from app.tasks.data_fetch_lock import serialized_data_fetch_task
from app.wiring.bootstrap import get_refresh_futures_use_case


@serialized_data_fetch_task(
    celery_app,
    "futures-price-refresh",
    name="app.interfaces.tasks.futures_tasks.refresh_futures",
)
def refresh_futures(self, *, origin: str = "scheduled") -> dict:
    result = get_refresh_futures_use_case().execute()
    return {"origin": origin, **result.as_dict()}
