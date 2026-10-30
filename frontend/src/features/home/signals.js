/** The Home page's signal lists: one scan-results query (sort + filters) each. */
export const ROWS_PER_SIGNAL = 4;
// Keeps penny stocks and empty shells out of the lists, as Finviz's do.
const LIQUID = { min_market_cap_usd: 300_000_000, min_volume: 10_000_000 };

/**
 * Each signal is one scan-results query: a sort plus optional filters. The
 * 52-week fields are % below the high / above the low (backend convention).
 */
export const SIGNALS = {
  topGainers: { label: 'Top gainers', params: { ...LIQUID, sort_by: 'price_change_1d', sort_order: 'desc' } },
  newHighs: { label: 'New high', params: { ...LIQUID, max_52w_high: 0.5, sort_by: 'price_change_1d', sort_order: 'desc' } },
  unusualVolume: { label: 'Unusual volume', params: { ...LIQUID, sort_by: 'volume_surge', sort_order: 'desc' } },
  mostActive: { label: 'Most active', params: { ...LIQUID, sort_by: 'volume', sort_order: 'desc' } },
  topLosers: { label: 'Top losers', params: { ...LIQUID, sort_by: 'price_change_1d', sort_order: 'asc' } },
  newLows: { label: 'New low', params: { ...LIQUID, max_52w_low: 0.5, sort_by: 'price_change_1d', sort_order: 'asc' } },
  mostVolatile: { label: 'Most volatile', params: { ...LIQUID, sort_by: 'adr_percent', sort_order: 'desc' } },
};

export const LEFT = ['topGainers', 'newHighs', 'unusualVolume', 'mostActive'];
export const RIGHT = ['topLosers', 'newLows', 'mostVolatile'];
