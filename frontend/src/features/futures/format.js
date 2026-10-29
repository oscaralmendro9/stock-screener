// Futures quote in a precision that fits its scale: 5,123.25 / 1.0842 / 0.006512.
export function formatFuturesPrice(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const options = abs >= 10
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : abs >= 1
      ? { minimumFractionDigits: 4, maximumFractionDigits: 4 }
      : { maximumSignificantDigits: 4 };
  return new Intl.NumberFormat(undefined, options).format(value);
}

const whole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// Compact label for range ends: whole units from 1,000 up, else full precision.
export function formatAxisPrice(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Math.abs(value) >= 1000 ? whole.format(value) : formatFuturesPrice(value);
}

const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

// Fraction → "12.3%", for volatility and distances where sign is context.
export function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return percent.format(value);
}

// COT net as share of open interest (already in percent units): "+5.5% OI".
export function formatNetOfOpenInterest(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1)}% OI`;
}

// 0-100 percentile → "82nd".
export function formatOrdinal(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  const n = Math.round(value);
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export const TREND_LABELS = { up: 'Uptrend', down: 'Downtrend', mixed: 'Mixed' };

// Sort keys offered on the dashboard; values are metric fields.
export const SORT_OPTIONS = [
  { value: 'default', label: 'Default order' },
  { value: 'change_1d', label: '1D change' },
  { value: 'change_1w', label: '1W change' },
  { value: 'change_1m', label: '1M change' },
  { value: 'change_ytd', label: 'YTD change' },
  { value: 'from_high_52w', label: 'Distance from 52W high' },
];

// Highest first; contracts without the metric stay at the bottom in registry order.
export function sortContracts(contracts, key) {
  if (key === 'default') return contracts;
  const value = (contract) => contract.metrics?.[key];
  return [...contracts].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return vb - va;
  });
}
