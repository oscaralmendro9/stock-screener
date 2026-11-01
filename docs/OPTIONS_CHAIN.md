# Options Chain (on demand)

`/chain/:symbol` shows the option chain and its analytics for any optionable symbol, not only the Options Command Center cohort. Open it from the search palette ("Options chain for NVDA") or the **Options chain** chip on a stock page.

## What it shows

- **Expiration picker.** Defaults to the nearest expiration at least 7 days out.
- **Analytics** from the same calculators as the Command Center (`app/domain/options_analytics/metrics`): ATM IV, 20-day realized volatility, IV minus realized, 25-delta put−call skew, max pain, call/put volume, volume/OI, and model-estimated net GEX, gamma flip and call/put walls.
- **Volatility smile** (call and put IV by strike) and **estimated GEX by strike**, both within ±25% of spot.
- **Chain table**, calls and puts by strike: OI, volume, IV, delta, bid, ask on desktop; mid and IV on phones. The 21 strikes nearest spot show first; **All strikes** lists the rest. In-the-money cells are tinted and the at-the-money strike is marked.

## Data and assumptions

- Chains come from Yahoo Finance through `YahooOptionsProvider`, rate-limited on the shared `yfinance:options` key. Data is delayed.
- Spot is the latest cached daily close when the price cache has one (`spot_source: cached_close`), else the provider's last price (`provider`). Mid-session the cached close can be the prior session's.
- Delta is the provider's when present, otherwise Black-Scholes on the contract's IV, the 13-week T-bill (`^IRX`) rate and a zero dividend yield. Without a rate, rate-dependent metrics (GEX, flip, walls, skew) report unavailable and the rest still shows.
- GEX figures assume calls positive and puts negative. They are model estimates, not observed dealer positions.

## Caching

The read goes to the provider in the request path, so each API process caches: a chain for 5 minutes, the expiration list for 30 minutes, and the rate for 6 hours. Failed loads are not cached.

## API

`GET /api/v1/options/{symbol}/chain?expiration=YYYY-MM-DD`

| Status | `detail.code` | Meaning |
|---|---|---|
| 200 | — | Chain, metrics, smile inputs and GEX by strike |
| 404 | `options_chain_unavailable` | No listed options, an empty chain, or no spot price |
| 422 | `invalid_symbol` / `expiration_not_listed` | Bad ticker, or an expiration the symbol does not list |
| 429 | `options_provider_throttled` | Yahoo is rate-limiting |
| 503 | `options_provider_unavailable` | Yahoo did not respond |
