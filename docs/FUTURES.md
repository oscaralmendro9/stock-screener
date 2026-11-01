# Futures Dashboard

The Futures page tracks 45 liquid US-listed futures across equity indices, rates, energy, metals, currencies, crypto, grains, softs and livestock. It is a dashboard, not a scanner: the contract list is curated in `backend/app/domain/futures/contracts.py`.

## Data

- **Prices** are Yahoo continuous front-month symbols (`ES=F`, `GC=F`) through the shared price cache. They roll to the next contract near expiry with no back-adjustment, so long-window changes can include a roll gap. Treat them as delayed.
- **Positioning** comes from the existing CFTC COT publication (`/cot`). Contracts with a `cot_slug` show the focal participant's net position as a share of open interest and its 3-year percentile; the dashboard flags the 10th/90th percentile tails as "extreme".

## Refresh

`app.interfaces.tasks.futures_tasks.refresh_futures` runs on the shared data-fetch queue on weekdays at 17:20 ET, after settlement. It tops up each contract through `PriceCacheService.get_historical_data` (incremental when cached) and records failures per symbol without stopping the batch. `POST /v1/futures/refresh` (the page's **Load prices** button) queues the same task.

The read endpoints never call a provider. A contract with no cached bars appears with no metrics and the page offers **Load prices**.

Mid-session, a refresh stores a partial bar for today; the price cache marks it and replaces it after the close. Each contract reports its own `as_of` date.

## Metrics

| Metric | Calculation |
|---|---|
| 1D / 1W / 1M / 3M | Last close vs the close 1 / 5 / 21 / 63 sessions earlier |
| YTD | Last close vs the last close of the prior calendar year |
| 52W range | Highest high and lowest low of the last 252 sessions (needs 252 sessions) |
| Trend | `up` when close > SMA50 > SMA200, `down` when close < SMA50 < SMA200, else `mixed` (needs 200 sessions) |
| Realized vol | Std. dev. of the last 20 daily log returns × √252 |

Lookbacks without enough history are left empty rather than estimated.

## API

| Route | Purpose |
|---|---|
| `GET /api/v1/futures` | Dashboard grouped by category, with metrics, sparkline, COT summary and `missing_symbols` |
| `GET /api/v1/futures/contracts` | The registry, for symbol search |
| `GET /api/v1/futures/{symbol}/history?period=3mo\|6mo\|1y\|2y` | OHLCV bars; accepts `GC` or `GC=F` |
| `POST /api/v1/futures/refresh` | Queue a refresh (202) |
