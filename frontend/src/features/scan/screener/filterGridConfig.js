/**
 * Filter grid for the live screener: every filter as "label + one control",
 * grouped in tabs, with Finviz-style preset buckets ("Over 80", "Under $10")
 * for range filters. Each preset is a {min, max} range in the same shape the
 * filter state already uses, so presets and the old min/max inputs agree.
 */
import {
  MARKET_CAP_OPTIONS,
  MARKET_OPTIONS,
  SE_PATTERN_OPTIONS,
  STAGE_OPTIONS,
  VOLUME_OPTIONS,
} from '../components/filterPanel/constants';

const range = (min, max) => ({ min: min ?? null, max: max ?? null });
const money = (value) => {
  if (value >= 1e9) return `$${value / 1e9}B`;
  if (value >= 1e6) return `$${value / 1e6}M`;
  return `$${value}`;
};
const percent = (value) => `${value}%`;
const times = (value) => `${value}x`;
const plain = (value) => String(value);

const over = (values, format = plain) => values.map((value) => ({ label: `Over ${format(value)}`, value: range(value, null) }));
const under = (values, format = plain) => values.map((value) => ({ label: `Under ${format(value)}`, value: range(null, value) }));

const SCORE_PRESETS = over([50, 60, 70, 80, 90]);
const GROWTH_PRESETS = [
  { label: 'Positive', value: range(0, null) },
  ...over([10, 20, 25, 30, 50, 100], percent),
];
const MOVE_PRESETS = (steps) => [
  { label: 'Up', value: range(0, null) },
  ...steps.map((step) => ({ label: `Up ${step}%`, value: range(step, null) })),
  { label: 'Down', value: range(null, 0) },
  ...steps.map((step) => ({ label: `Down ${step}%`, value: range(null, -step) })),
];
const MA_DISTANCE_PRESETS = [
  { label: 'Above', value: range(0, null) },
  { label: 'Above 5%', value: range(5, null) },
  { label: 'Above 10%', value: range(10, null) },
  { label: 'Below', value: range(null, 0) },
  { label: 'Below 5%', value: range(null, -5) },
  { label: 'Below 10%', value: range(null, -10) },
];

// Size classes as Finviz names them, in USD.
const MARKET_CAP_USD_PRESETS = [
  { label: 'Mega ($200B+)', value: range(200e9, null) },
  { label: 'Large ($10B–$200B)', value: range(10e9, 200e9) },
  { label: 'Mid ($2B–$10B)', value: range(2e9, 10e9) },
  { label: 'Small ($300M–$2B)', value: range(300e6, 2e9) },
  { label: 'Micro ($50M–$300M)', value: range(50e6, 300e6) },
  { label: 'Nano (under $50M)', value: range(null, 50e6) },
  { label: '+Large (over $10B)', value: range(10e9, null) },
  { label: '+Mid (over $2B)', value: range(2e9, null) },
  { label: '+Small (over $300M)', value: range(300e6, null) },
];

export const FILTER_TABS = [
  { id: 'descriptive', label: 'Descriptive' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'technical', label: 'Technical' },
  { id: 'setups', label: 'Scores & Setups' },
  { id: 'all', label: 'All' },
];

/**
 * type: text | multi | select | bool | range.
 * range: presets (may be empty: custom only), minOnly hides the max input,
 * prefix/suffix label the custom inputs.
 */
export const FILTER_GRID = [
  // Descriptive
  { key: 'symbolSearch', tab: 'descriptive', label: 'Ticker', type: 'text', placeholder: 'e.g. NVDA' },
  { key: 'markets', tab: 'descriptive', label: 'Market', type: 'multi', options: () => MARKET_OPTIONS },
  { key: 'gicsSectors', tab: 'descriptive', label: 'Sector', type: 'multi', moded: true, options: (opts) => opts.gicsSectors || [] },
  { key: 'ibdIndustries', tab: 'descriptive', label: 'Industry', type: 'multi', moded: true, options: (opts) => opts.ibdIndustries || [] },
  { key: 'marketCapUsd', tab: 'descriptive', label: 'Market cap', type: 'range', presets: MARKET_CAP_USD_PRESETS, prefix: '$' },
  { key: 'minMarketCap', tab: 'descriptive', label: 'Mkt cap (local)', type: 'select', options: MARKET_CAP_OPTIONS },
  { key: 'price', tab: 'descriptive', label: 'Price', type: 'range', prefix: '$',
    presets: [...under([1, 5, 10, 20, 50], money), ...over([5, 10, 20, 50, 100], money), { label: '$10 to $50', value: range(10, 50) }] },
  { key: 'advUsd', tab: 'descriptive', label: 'Avg $ volume', type: 'range', prefix: '$', presets: over([1e6, 5e6, 10e6, 50e6, 100e6, 500e6], money) },
  { key: 'minVolume', tab: 'descriptive', label: '$ volume (local)', type: 'select', options: VOLUME_OPTIONS },
  { key: 'ipoAfter', tab: 'descriptive', label: 'IPO date', type: 'select',
    options: [
      { value: '6m', label: 'Last 6 months' },
      { value: '1y', label: 'Last year' },
      { value: '2y', label: 'Last 2 years' },
      { value: '3y', label: 'Last 3 years' },
      { value: '5y', label: 'Last 5 years' },
    ] },

  // Fundamental
  { key: 'epsGrowth', tab: 'fundamental', label: 'EPS growth', type: 'range', suffix: '%', minOnly: true, presets: GROWTH_PRESETS },
  { key: 'salesGrowth', tab: 'fundamental', label: 'Sales growth', type: 'range', suffix: '%', minOnly: true, presets: GROWTH_PRESETS },
  { key: 'epsRating', tab: 'fundamental', label: 'EPS rating', type: 'range', minOnly: true, presets: SCORE_PRESETS },

  // Technical
  { key: 'stage', tab: 'technical', label: 'Stage', type: 'select', options: STAGE_OPTIONS },
  { key: 'rsRating', tab: 'technical', label: 'RS rating', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'rs1m', tab: 'technical', label: 'RS 1M', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'rs3m', tab: 'technical', label: 'RS 3M', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'rs12m', tab: 'technical', label: 'RS 12M', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'betaAdjRs', tab: 'technical', label: 'β-adj RS', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'rsLineBlueDotRecent', tab: 'technical', label: 'RS blue dot', type: 'bool' },
  { key: 'maAlignment', tab: 'technical', label: 'MA aligned', type: 'bool' },
  { key: 'powerTrend', tab: 'technical', label: 'Power trend', type: 'bool' },
  { key: 'pocketPivot', tab: 'technical', label: 'Pocket pivot', type: 'bool' },
  { key: 'perfDay', tab: 'technical', label: 'Change', type: 'range', suffix: '%', presets: MOVE_PRESETS([2, 5, 10]) },
  { key: 'perfWeek', tab: 'technical', label: 'Perf week', type: 'range', suffix: '%', presets: MOVE_PRESETS([5, 10, 20]) },
  { key: 'perfMonth', tab: 'technical', label: 'Perf month', type: 'range', suffix: '%', presets: MOVE_PRESETS([10, 20, 30]) },
  { key: 'perf3m', tab: 'technical', label: 'Perf quarter', type: 'range', suffix: '%', presets: MOVE_PRESETS([10, 20, 50]) },
  { key: 'perf6m', tab: 'technical', label: 'Perf half year', type: 'range', suffix: '%', presets: MOVE_PRESETS([20, 50, 100]) },
  { key: 'gapPercent', tab: 'technical', label: 'Gap', type: 'range', suffix: '%', presets: MOVE_PRESETS([1, 3, 5]) },
  { key: 'volumeSurge', tab: 'technical', label: 'Volume surge', type: 'range', suffix: 'x', presets: over([1.5, 2, 3, 5], times) },
  { key: 'adrPercent', tab: 'technical', label: 'ADR', type: 'range', suffix: '%', presets: [...under([2, 3], percent), ...over([2, 3, 4, 5, 6], percent)] },
  { key: 'beta', tab: 'technical', label: 'Beta', type: 'range',
    presets: [...under([0.5, 1]), ...over([1, 1.5, 2]), { label: '0.5 to 1.5', value: range(0.5, 1.5) }] },
  { key: 'ema10Distance', tab: 'technical', label: 'vs EMA10', type: 'range', suffix: '%', presets: MA_DISTANCE_PRESETS },
  { key: 'ema20Distance', tab: 'technical', label: 'vs EMA20', type: 'range', suffix: '%', presets: MA_DISTANCE_PRESETS },
  { key: 'ema50Distance', tab: 'technical', label: 'vs EMA50', type: 'range', suffix: '%', presets: MA_DISTANCE_PRESETS },
  // Stored as % below the high (backend minervini_scanner: from_high_pct >= 0).
  { key: 'week52HighDistance', tab: 'technical', label: '52W high', type: 'range', suffix: '%',
    presets: [
      ...[5, 10, 15, 25].map((value) => ({ label: `Within ${value}% of high`, value: range(null, value) })),
      ...[25, 50].map((value) => ({ label: `${value}%+ below high`, value: range(value, null) })),
    ] },
  { key: 'week52LowDistance', tab: 'technical', label: '52W low', type: 'range', suffix: '%',
    presets: [
      ...[30, 50, 100].map((value) => ({ label: `${value}%+ above low`, value: range(value, null) })),
      { label: 'Within 10% of low', value: range(null, 10) },
    ] },

  // Scores & setups
  { key: 'compositeScore', tab: 'setups', label: 'Composite', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'minerviniScore', tab: 'setups', label: 'Minervini', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'canslimScore', tab: 'setups', label: 'CANSLIM', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'ipoScore', tab: 'setups', label: 'IPO score', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'customScore', tab: 'setups', label: 'Custom score', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'volBreakthroughScore', tab: 'setups', label: 'Vol breakthrough', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'passesTemplate', tab: 'setups', label: 'Passes template', type: 'bool' },
  { key: 'seSetupScore', tab: 'setups', label: 'Setup score', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'sePatternPrimary', tab: 'setups', label: 'Pattern', type: 'multi', options: () => SE_PATTERN_OPTIONS },
  { key: 'seSetupReady', tab: 'setups', label: 'Setup ready', type: 'bool' },
  // Sign convention is the detector's; no presets until it is pinned down.
  { key: 'seDistanceToPivot', tab: 'setups', label: 'Distance to pivot', type: 'range', suffix: '%', presets: [] },
  { key: 'seBbSqueeze', tab: 'setups', label: 'Squeeze pctile', type: 'range', presets: under([10, 20, 30]) },
  { key: 'seVolumeVs50d', tab: 'setups', label: 'Volume vs 50d', type: 'range', suffix: 'x', presets: over([1, 1.5, 2, 3], times) },
  { key: 'seUpDownVolume', tab: 'setups', label: 'Up/down volume', type: 'range', suffix: 'x', presets: over([1, 1.5, 2], times) },
  { key: 'seRsLineNewHigh', tab: 'setups', label: 'RS line new high', type: 'bool' },
  { key: 'seRsLineBlueDot', tab: 'setups', label: 'Setup blue dot', type: 'bool' },
  { key: 'vcpScore', tab: 'setups', label: 'VCP score', type: 'range', minOnly: true, presets: SCORE_PRESETS },
  { key: 'vcpDetected', tab: 'setups', label: 'VCP', type: 'bool' },
  { key: 'vcpReady', tab: 'setups', label: 'VCP ready', type: 'bool' },
];

/** The preset whose range equals `value`, or null (no value, or a custom range). */
export function matchRangePreset(presets, value) {
  const min = value?.min ?? null;
  const max = value?.max ?? null;
  if (min == null && max == null) return null;
  return presets.find((preset) => preset.value.min === min && preset.value.max === max) ?? null;
}
