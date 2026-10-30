import { screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/renderWithProviders';
import { SplitBar } from './BreadthBars';
import { changeColor, layoutHeatmap } from './MarketHeatmap';
import SignalTables, { SIGNALS } from './SignalTables';

const getScanResults = vi.fn();
vi.mock('../../api/scans', () => ({
  getScanResults: (...args) => getScanResults(...args),
}));

describe('SplitBar', () => {
  it('labels both sides with their share and count', () => {
    renderWithProviders(<SplitBar leftLabel="Advancing" rightLabel="Declining" left={600} right={400} />);

    expect(screen.getByText('60.0% (600)')).toBeInTheDocument();
    expect(screen.getByText('(400) 40.0%')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName('Advancing 600 (60.0%), Declining 400 (40.0%)');
  });

  it('measures against an explicit total (stocks neither side counts)', () => {
    renderWithProviders(<SplitBar leftLabel="Above" rightLabel="Below" left={25} right={25} total={100} />);
    expect(screen.getByText('25.0% (25)')).toBeInTheDocument();
  });
});

describe('layoutHeatmap', () => {
  const items = [
    { symbol: 'AAPL', gics_sector: 'Technology', market_cap_usd: 300, price_change_1d: 1 },
    { symbol: 'MSFT', gics_sector: 'Technology', market_cap_usd: 100, price_change_1d: -1 },
    { symbol: 'XOM', gics_sector: 'Energy', market_cap_usd: 100, price_change_1d: 0 },
    { symbol: 'NOCAP', gics_sector: 'Energy', market_cap_usd: null, price_change_1d: 5 },
    { symbol: 'SPY', gics_sector: null, market_cap_usd: 900, price_change_1d: 0.5 },
  ];

  it('groups by sector, biggest first, and drops names without a market cap or a sector (funds)', () => {
    const { sectors, tiles } = layoutHeatmap(items, 400, 300);

    expect(sectors.map((sector) => sector.name)).toEqual(['Technology', 'Energy']);
    expect(tiles.map((tile) => tile.symbol).sort()).toEqual(['AAPL', 'MSFT', 'XOM']);
  });

  it('sizes tiles by market cap', () => {
    const { tiles } = layoutHeatmap(items, 400, 300);
    const area = (symbol) => {
      const tile = tiles.find((item) => item.symbol === symbol);
      return tile.width * tile.height;
    };
    expect(area('AAPL') / area('MSFT')).toBeGreaterThan(2);
  });
});

describe('changeColor', () => {
  it('runs from red through neutral to green', () => {
    expect(changeColor(-5)).toBe(changeColor(-3));
    expect(changeColor(0)).toBe(changeColor(null));
    expect(changeColor(5)).not.toBe(changeColor(-5));
    expect(changeColor(0.5)).not.toBe(changeColor(0));
  });
});

describe('SignalTables', () => {
  it('lists each signal from its own lightweight query and adds snapshot leaders', async () => {
    // One distinct ticker per signal query.
    getScanResults.mockImplementation((_scanId, params) => {
      const extra = params.max_52w_high != null ? '-HI' : params.max_52w_low != null ? '-LO' : '';
      const symbol = `${params.sort_order === 'asc' ? 'DOWN' : 'UP'}-${params.sort_by}${extra}`;
      return Promise.resolve({ results: [{ symbol, current_price: 10, currency: 'USD', price_change_1d: params.sort_order === 'asc' ? -4 : 4, volume: 2e7 }] });
    });

    renderWithProviders(
      <MemoryRouter>
        <SignalTables scanId="scan-1" leaders={[{ symbol: 'LEAD', current_price: 50, currency: 'USD', price_change_1d: 1 }]} />
      </MemoryRouter>,
    );

    const gainer = await screen.findByRole('link', { name: 'UP-price_change_1d' });
    expect(gainer).toHaveAttribute('href', '/stocks/UP-price_change_1d');
    expect(within(gainer.closest('tr')).getByText('+4.00%')).toBeInTheDocument();
    expect(within(gainer.closest('tr')).getByText('Top gainers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LEAD' }).closest('tr')).toHaveTextContent('Leader');

    expect(getScanResults).toHaveBeenCalledWith('scan-1', expect.objectContaining({
      ...SIGNALS.newHighs.params,
      per_page: 4,
      include_sparklines: false,
    }));
    expect(getScanResults).toHaveBeenCalledTimes(Object.keys(SIGNALS).length);
  });
});
