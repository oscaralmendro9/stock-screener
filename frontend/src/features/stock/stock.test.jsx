import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KeyStatsGrid from './KeyStatsGrid';
import { buildKeyStats } from './keyStats';
import { atr, distancePct, performance, rangeVolatility, relativeVolume, rsi, sma } from './stockStats';

const bars = (closes, { volume = 100, spread = 2 } = {}) => closes.map((close, index) => ({
  date: `2026-01-${String(index + 1).padStart(2, '0')}`,
  open: close,
  high: close + spread / 2,
  low: close - spread / 2,
  close,
  volume,
}));

describe('stockStats', () => {
  it('measures performance over a number of sessions, or null without enough history', () => {
    const history = bars([100, 101, 102, 103, 104, 110]);
    expect(performance(history, 5)).toBeCloseTo(10);
    expect(performance(history, 1)).toBeCloseTo((110 / 104 - 1) * 100);
    expect(performance(history, 6)).toBeNull();
  });

  it('averages closes and measures the distance from a level', () => {
    const history = bars([10, 20, 30]);
    expect(sma(history, 3)).toBe(20);
    expect(sma(history, 4)).toBeNull();
    expect(distancePct(110, 100)).toBeCloseTo(10);
    expect(distancePct(110, null)).toBeNull();
  });

  it('reads RSI at the extremes', () => {
    expect(rsi(bars(Array.from({ length: 20 }, (_, i) => 100 + i)))).toBe(100);
    expect(rsi(bars(Array.from({ length: 20 }, (_, i) => 100 - i)))).toBeCloseTo(0);
    expect(rsi(bars([1, 2, 3]))).toBeNull();
  });

  it('measures ranges and relative volume', () => {
    const history = bars(Array.from({ length: 30 }, () => 100), { spread: 2 });
    expect(atr(history, 14)).toBeCloseTo(2);
    expect(rangeVolatility(history, 5)).toBeCloseTo(2);
    const spike = [...bars(Array.from({ length: 30 }, () => 100), { volume: 100 }), { ...bars([100])[0], volume: 300 }];
    expect(relativeVolume(spike)).toBeCloseTo(3);
  });
});

const payload = {
  symbol: 'XOM',
  info: { name: 'ExxonMobil', current_price: 110 },
  fundamentals: { market_cap_usd: 5e11, pe_ratio: 23.89, profit_margin: 0.0907 },
  technicals: { ma_50: 100, high_52w: 120, low_52w: 80 },
  chart: {
    chart_data: { rs_rating: 95, stage: 2, ma_alignment: true, passes_template: false, rs_trend: 1, ibd_group_rank: 20 },
    price_history: bars([100, 101, 102, 103, 104, 110]),
  },
};

describe('buildKeyStats / KeyStatsGrid', () => {
  it('fills six columns from the dashboard payload', () => {
    const columns = buildKeyStats(payload);
    expect(columns).toHaveLength(6);
    const cell = (label) => columns.flat().find(([name]) => name === label)[1];
    expect(cell('P/E')).toBe('23.89');
    expect(cell('Profit margin')).toBe('9.1%');
    expect(cell('SMA50').text).toBe('+10.00%');
    expect(cell('Perf week').text).toBe('+10.00%');
    expect(cell('Stage')).toBe('Stage 2');
    expect(cell('Template')).toBe('Fail');
    expect(cell('RS trend')).toBe('▲ Rising');
    // Not enough history for a quarter: shown as "-".
    expect(cell('Perf quarter')).toBeNull();
  });

  it('renders labelled values, signs on direction, and a dash for missing data', () => {
    render(<KeyStatsGrid data={payload} />);
    const grid = screen.getByRole('region', { name: 'Key statistics' });
    const row = (label) => within(grid).getByText(label).closest('div');
    expect(row('Market cap')).toHaveTextContent('$500.0B');
    expect(row('52W high')).toHaveTextContent('$120.00-8.33%');
    expect(row('PEG')).toHaveTextContent(/-$/);
  });
});
