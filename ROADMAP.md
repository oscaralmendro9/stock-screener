# Roadmap

Fork of [xang1234/stock-screener](https://github.com/xang1234/stock-screener)
(Apache-2.0), extended to futures and broader options coverage, with a
responsive web UI for phone and desktop.

Decisions: extend the fork; free data first (yfinance, CFTC) behind a
provider layer that can take paid APIs later; migrate UI from MUI to
Tailwind + shadcn following `DESIGN.md`.

## Phase 0 — Foundation (done)
- [x] UI skills installed in `.claude/skills` (ui-ux-pro-max, baseline-ui, accessibility, motion, metadata, improve-ui)
- [x] Design system generated and reconciled in `DESIGN.md`
- [x] Tailwind v4 alongside MUI, tokens, `@/` alias, `components.json`, base primitives in `frontend/src/ui`

## Phase 1 — New shell
- [ ] Tailwind app shell: top nav on desktop, bottom tab bar on phones, market selector, color mode
- [ ] Global symbol search (stocks, futures, options underlyings)
- [ ] Spanish/English i18n

## Phase 2 — Futures module
- [ ] Futures registry built from the existing COT registry (`backend/app/domain/cot/registry.py`) and its Yahoo `=F` symbols
- [ ] Provider port for futures prices (yfinance continuous contracts first)
- [ ] `/futures` dashboard: by category (indices, rates, energy, metals, grains, softs, FX, crypto) with performance, trend and COT positioning
- [ ] `/futures/:symbol` detail: chart, COT history, seasonality

## Phase 3 — Options beyond the current cohort
- [ ] Options chain viewer for any optionable US symbol on demand
- [ ] Greeks, IV smile/term structure, GEX reusing `use_cases/options_analytics`
- [ ] Provider port so non-US chains can plug in a paid source

## Phase 4 — Page migration
- [ ] Daily → Scan → Stock detail → Breadth → Groups → Options → the rest
- [ ] Remove MUI and enable Tailwind preflight

## Phase 5 — Paid data (optional)
- [ ] Adapters for e.g. Polygon/Massive (stocks/options), Databento (futures), EODHD (global)
