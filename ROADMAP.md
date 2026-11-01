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
- [x] Tailwind app shell: top nav on desktop, bottom tab bar + "More" sheet on phones, native market selector, Radix profile menu, color mode
- [x] Static-site header (`static/StaticLayout.jsx`) on Tailwind, sharing the native market select
- [x] Global search palette (Ctrl/⌘+K or `/`): symbols by ticker or company name, page jumps, direct ticker fallback. Futures and options underlyings join it in phases 2–3
- [ ] Assistant drawer stays an MUI `Drawer` until `AssistantChat` migrates (its MUI dialogs can't open inside a Radix modal)
- [~] Spanish/English i18n — dropped for now: the app stays in English

## Phase 2 — Futures module
- [x] Futures registry (45 contracts, 9 categories) linked to the COT registry: `backend/app/domain/futures/`
- [x] Price metrics (1D/1W/1M/3M/YTD, 52W range, 50/200 trend, 20D realized vol, 3M sparkline) as pure functions
- [x] `GET /v1/futures` (cache-only), `GET /v1/futures/contracts`, `GET /v1/futures/{symbol}/history`, `POST /v1/futures/refresh`
- [x] Celery `refresh_futures` on the shared data-fetch queue, weekdays 17:20 ET
- [x] `/futures` dashboard and `/futures/:symbol` detail (candles, stats, COT chart); futures in the search palette
- [ ] Seasonality and term structure (needs dated contracts, not just continuous front-month)
- [ ] Static-site export of the futures dashboard

## Phase 3 — Options beyond the current cohort
- [x] On-demand chain for any optionable symbol: `GET /v1/options/{symbol}/chain` (provider read, per-process cache)
- [x] Delta per contract, IV smile, GEX by strike and the Command Center metrics, reusing `domain/options_analytics`
- [x] `/chain/:symbol` page; entry points in the search palette and the stock page
- [ ] Provider port so non-US chains can plug in a paid source
- [ ] IV term structure across expirations

## UI/UX pass (done)
- [x] Audit of Daily → Scan → stock detail at 390px and 1440px with the UI skills
- [x] Daily tabs responsive (row on phones, rail on desktop); readable error states with Retry; Scan filter header wraps
- [ ] `RuntimeProvider` subscribes to every query-cache event, which triggers a dev-only "update while rendering" warning; narrowing it broke a startup test, so it needs its own change

## Phase 3b — Information architecture (Finviz-style sections)
- [x] Top bar lists sections only: Home · Screener · Groups · Market · Futures · Watchlists (+ Options when enabled); sub-pages are `SectionTabs` (Screener | Backtest, Industry groups | Themes, Contracts | COT positioning)
- [x] Home is the daily snapshot alone; Key Markets (TradingView widget) and the Stockbee frame retired from it; COT moved to `/cot`, Watchlists to `/watchlists`
- [x] `FEATURE_THEMES` / `FEATURE_CHATBOT` pass through docker-compose (default true) so a deployment without LLM keys can hide Themes and the assistant
- [x] Home rebuilt Finviz-style: breadth split bars, signal lists (gainers/losers, new highs/lows, unusual volume, most active/volatile, leaders) and a sector market map from `GET /v1/scans/{id}/heatmap` (six fields per name, pages walked server-side)
- [x] Stock page as the quote hub: Finviz-style header, Overview | Options tabs (`?tab=options` embeds the chain), full-width chart and a six-column key-stats grid (fundamentals, performance, trend, volume/volatility, RS, scores; price-derived stats computed from the dashboard history). The MUI metrics sidebar is gone from it; the analysis accordions stay below
- [x] Maps: full-screen market map at `/maps` (top 300/500/1000, sector or sector & industry), live-only nav item
- [x] "New scan" out of the screener's main view: the control bar keeps the loaded-scan picker, progress, Cancel and "Use last published data"; market, universe, strategies and Scan open from "New scan" (and on their own when nothing is loaded)

## Design review (Impeccable · Taste · Apple design skills, 2026-10-31)
Fixed:
- [x] No text under 11px on Home (was 168 nodes: map labels, sparkline change, chart axes); map tiles too small for an 11px label show none (name stays in the tooltip and accessible label)
- [x] No zebra rows or header bands in any table (MUI theme and the Tailwind tables); the stock key-stats grid drops its alternating fill
- [x] Accent only on data and links: the Home "Signal" column is grey
- [x] Breadth history: neutral group headers, 1px dividers instead of 3px coloured left borders, tabular digits instead of monospace, 11px floor

Open:
- [ ] Mixed capitalization: section titles are Title Case ("Top Scan Candidates") while newer ones are sentence case ("Market map"); pick one (tests and the static site share the strings)
- [x] Brand face: owner chose "ink and teal" (teal accent, neutral ink chrome, Instrument Sans); see DESIGN.md
- [x] Groups page: coloured rank squares replaced by plain ranks (accent badge for the top 20), MUI tabs by Radix tabs
- [ ] Map tiles under 24px are below WCAG 2.5.8 target size; covered by the equivalent-control exception (symbol search), noted rather than fixed
- [~] Key-market cards keep their sparklines (Taste bans sparklines on KPIs): here the index trend is the content, as on Finviz

## Phase 4 — Page migration
- [x] Daily: snapshot tab, key-market cards, market health, correction survivors, scan-row tables, top groups and the phone `StockRowCard` (taps on inert badges are forwarded to open the card instead of relying on `pointer-events`) on Tailwind
- [~] Scan, Finviz-style: filter grid with preset buckets and category tabs (`features/scan/screener/`), view tabs (Overview, Growth, Technical, Setups, Scores) on a compact paged table; "All columns" and phones keep `ResultsTable`. The scan control bar (native selects with placeholders, `aria-pressed` strategy toggles, labelled custom-filter inputs, `ui/notice` errors, `ScanProgress` as an ARIA progress bar) is on Tailwind. So are the presets menu (native select, Radix actions menu, delete confirms in an alert dialog instead of `window.confirm`), `SavePresetDialog` (`ui/dialog`, Enter submits through a form) and `CompactMultiSelect` (chips plus a Radix popover listbox with search, arrow keys and Enter). Still MUI: the static site's `FilterPanel` sections
- [~] Stock detail: the page body is on Tailwind (collapsible `<details>` sections, badges, peers table, lookback toggle, skeleton, notices). Still MUI inside it: `QueryErrorAlert`. `AddToWatchlistMenu` is now a Radix popover with menu semantics, rendered without a portal so it also works inside the remaining MUI modals
- [x] Breadth: page, context strip, history table, chart (theme tokens, `aria-pressed` range toggle, day ticks on short ranges), formula toggletips (`ui/popover`, open on hover, tap or keyboard) and the contributor dialog (Radix) on Tailwind. The static site's `StaticBreadthPage` shell stays MUI
- [x] Groups: page, view tabs (shared with the static site), movers, rankings table (RS tints from tokens, `aria-sort` headers) and the group detail dialog (Radix, rank chart on tokens) on Tailwind; shared `ui/notice`. `RRGChart` (quadrant colours as CSS variables, native switches, `aria-pressed` quadrant filter, two native rank sliders, `CompactMultiSelect` name filter), the stock matrix (grid, clusters, a portalled `role="tooltip"` inspector clamped to the viewport, details on `ui/sheet`, native selects) and `GroupChartsGrid` / `GroupChartsLayout` (CSS-only two columns) too; `ChartSkeleton` moves with them
- [x] Options: Command Center (lens toggle, sortable table with `aria-sort`, keyboard rows), symbol detail (summary cards, strike charts and history on tokens, native `<details>` for method notes), status banner, quality/source badges and the not-in-cohort state on Tailwind. Covered by tests only so far: the module is off in this install (`OPTIONS_ANALYTICS_ENABLED=false`)
- [x] COT positioning (`/cot`, and the COT chart on futures detail): view, participant legend toggles, summary strip, curated-markets table (`aria-sort`, current row) on Tailwind; new `ui/native-select`
- [x] Validation (Backtest tab): page and the shared `ValidationPanels` (also used on stock detail) on Tailwind
- [~] Watchlists: tab (watchlist picker, stewardship counts and status filter, icon actions, empty state) and table (keyboard-openable rows, always-reachable remove button, 11px floor) on Tailwind. `UserWatchlistManager` on the new `ui/dialog` (Radix, flex-centred so drag-and-drop measures correctly; nested import dialog; delete confirms in an alert dialog instead of `window.confirm`). Still MUI: sparklines, `PriceChangeBar`, `ActionStateBadge`, the evidence drawer
- [x] Chart viewer: `ChartViewerModal`, `WatchlistChartModal` and `StaticChartViewerModal` on a full-screen Radix dialog with a shared header (`ChartViewerChrome`: no traffic-light boxes, accent for top-20 group rank and EPS ≥ 80), `StockMetricsSidebar`, `PeerComparisonModal` (`ui/dialog`), `SetupEngineDrawer` (`ui/sheet`) and `MarketThemesList` (Radix popover). Keys stay with the viewer (Space/Shift+Space, D, Esc closes the inner panel first) and pause while the peers dialog is on top
- [x] Shared bits: `PriceSparkline`, `RSSparkline` (native title + `role="img"` label instead of MUI tooltips, token colours), `ActionStateBadge` (a button only when it opens evidence), `PriceChangeBar`, `QueryErrorAlert` (on `ui/notice`)
- [x] `OpportunityEvidenceDrawer` on `ui/sheet` (tests only so far: this install has no opportunity-state evidence to open)
- [~] Operations: page (hash-driven ARIA tabs with arrow/Home/End keys, job console with native filters, progress bars, lease cards, queue/worker/alert tables, confirm dialogs on `ui/dialog`), `MarketCoverage`, `ThemeSourceHealth`, `InactiveMarkets` and `SchedulesSection` (per-market chips open Radix popovers, Run confirms on `ui/dialog`, tones exposed as `data-tone`/`data-variant`) on Tailwind. Still MUI: the social-signal health panel and the exposure research workspace (both features off in this install)
- [ ] The rest (Themes, assistant, static shells, the static FilterPanel sections)
- [ ] Remove MUI and enable Tailwind preflight

## Phase 5 — Paid data (optional)
- [ ] Adapters for e.g. Polygon/Massive (stocks/options), Databento (futures), EODHD (global)
