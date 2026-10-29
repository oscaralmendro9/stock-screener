const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

const finite = (value) => value != null && Number.isFinite(value);

export const formatMoney = (value) => (finite(value) ? twoDecimals.format(value) : '—');
export const formatCount = (value) => (finite(value) ? integer.format(value) : '—');
export const formatIv = (value) => (finite(value) ? percent.format(value) : '—');
export const formatDelta = (value) => (finite(value) ? value.toFixed(2) : '—');
export const formatCompact = (value) => (finite(value) ? compact.format(value) : '—');
// Skew and VRP are differences of fractions: "+3.2 pts".
export const formatPoints = (value) => {
  if (!finite(value)) return '—';
  const points = value * 100;
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points).toFixed(1)} pts`;
};

export function daysUntil(expiration, today) {
  return Math.round((Date.parse(expiration) - Date.parse(today)) / 86_400_000);
}

// Strikes nearest spot first: the window shown before "Show all strikes".
export function nearSpotRows(rows, spot, count) {
  if (rows.length <= count) return rows;
  const atmIndex = rows.reduce(
    (best, row, index) => (Math.abs(row.strike - spot) < Math.abs(rows[best].strike - spot) ? index : best),
    0,
  );
  const start = Math.max(0, Math.min(atmIndex - Math.floor(count / 2), rows.length - count));
  return rows.slice(start, start + count);
}

export function atmStrike(rows, spot) {
  return rows.reduce(
    (best, row) => (best == null || Math.abs(row.strike - spot) < Math.abs(best - spot) ? row.strike : best),
    null,
  );
}
