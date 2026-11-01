import { UNIVERSE_MARKETS } from '../../features/scan/constants';

// Derive full-name labels from the canonical universe constants so renames
// (e.g. "Hong Kong" → "Hong Kong SAR") stay in one place.
const MARKET_LABEL = Object.freeze(
  Object.fromEntries(UNIVERSE_MARKETS.map(({ value, label }) => [value, label])),
);

/**
 * Per-row market-origin badge shown next to the symbol. Neutral ink: the code
 * carries the meaning, and colour stays reserved for data and direction.
 * Returns null when the market is missing so US-only scans with stale
 * `market=null` rows (legacy universe data) stay visually quiet instead of
 * rendering a placeholder chip.
 */
function MarketBadge({ market, exchange }) {
  if (!market) return null;
  const name = MARKET_LABEL[market] ?? market;
  const title = exchange ? `${name} (${exchange})` : name;
  return (
    <span
      title={title}
      data-testid={`market-badge-${market}`}
      className="tw ml-1 inline-flex h-4 shrink-0 items-center rounded-full border border-border px-1 text-[11px] leading-none font-semibold text-muted-foreground"
    >
      {market}
    </span>
  );
}

export default MarketBadge;
