import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FuturesPage from './FuturesPage';
import FuturesDetailPage from './FuturesDetailPage';
import { renderWithProviders } from '../test/renderWithProviders';

const api = vi.hoisted(() => ({
  getFuturesDashboard: vi.fn(),
  getFuturesHistory: vi.fn(),
  queueFuturesRefresh: vi.fn(),
}));
vi.mock('../api/futures', async (importOriginal) => ({ ...(await importOriginal()), ...api }));
const getCotHistory = vi.hoisted(() => vi.fn());
vi.mock('../api/cot', async (importOriginal) => ({ ...(await importOriginal()), getCotHistory }));
vi.mock('../components/Charts/CandlestickChart', () => ({
  default: ({ priceData }) => <div data-testid="price-chart">{priceData.length} bars</div>,
}));

const metrics = (overrides = {}) => ({
  as_of: '2026-10-28',
  last: 5800.25,
  change_1d: 0.01,
  change_1w: 0.02,
  change_1m: 0.03,
  change_3m: 0.05,
  change_ytd: 0.12,
  high_52w: 6000,
  low_52w: 4800,
  from_high_52w: -0.033,
  from_low_52w: 0.208,
  sma_50: 5700,
  sma_200: 5500,
  trend: 'up',
  realized_vol_20d: 0.14,
  sparkline: [5700, 5750, 5800.25],
  ...overrides,
});

const contract = (root, name, category, overrides = {}) => ({
  symbol: `${root}=F`,
  root,
  name,
  exchange: 'CME',
  category,
  cot_slug: null,
  metrics: metrics(),
  cot: null,
  ...overrides,
});

const dashboard = (overrides = {}) => ({
  as_of: '2026-10-28',
  cot_report_date: '2026-10-21',
  missing_symbols: [],
  categories: [
    {
      id: 'equity_index',
      label: 'Equity indices',
      contracts: [
        contract('ES', 'E-mini S&P 500', 'equity_index', {
          cot_slug: 'sp-500',
          cot: {
            slug: 'sp-500',
            participant_label: 'Leveraged Funds',
            report_date: '2026-10-21',
            net: -120000,
            net_pct_open_interest: -5.46,
            percentile_3y: 8,
          },
        }),
      ],
    },
    {
      id: 'metals',
      label: 'Metals',
      contracts: [contract('GC', 'Gold', 'metals', { metrics: metrics({ last: 2650.1, change_1d: 0.04, trend: 'down' }) })],
    },
  ],
  ...overrides,
});

const renderAt = (path) => renderWithProviders(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/futures" element={<FuturesPage />} />
      <Route path="/futures/:symbol" element={<FuturesDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

describe('FuturesPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    getCotHistory.mockReset();
  });

  it('lists contracts with changes, trend and COT positioning', async () => {
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    renderAt('/futures');

    const table = await screen.findByRole('table');
    const es = within(table).getByRole('row', { name: /E-mini S&P 500/ });
    expect(es).toHaveTextContent('+1.00%');
    expect(es).toHaveTextContent('Uptrend');
    expect(es).toHaveTextContent('−5.5% OI');
    expect(es).toHaveTextContent('8th pct 3Y');
    expect(es).toHaveTextContent('extreme');
    expect(within(es).getByRole('link', { name: /E-mini S&P 500/ })).toHaveAttribute('href', '/futures/ES');
    expect(screen.getByText(/prices as of/)).toHaveTextContent('2026-10-28');
  });

  it('filters by category and sorts by a change column', async () => {
    const user = userEvent.setup();
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    renderAt('/futures');
    const table = await screen.findByRole('table');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), '1D change');
    const names = within(table).getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(names[0]).toMatch(/Gold/);

    await user.click(screen.getByRole('button', { name: 'Metals' }));
    expect(screen.getByRole('button', { name: 'Metals' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(table).queryByRole('row', { name: /E-mini/ })).not.toBeInTheDocument();
  });

  it('offers one action to load prices when none are cached', async () => {
    const user = userEvent.setup();
    const empty = dashboard({ as_of: null, missing_symbols: ['ES=F', 'GC=F'] });
    empty.categories.forEach((group) => group.contracts.forEach((item) => { item.metrics = null; }));
    api.getFuturesDashboard.mockResolvedValue(empty);
    api.queueFuturesRefresh.mockResolvedValue({ status: 'queued', task_id: 't1' });
    renderAt('/futures');

    expect(await screen.findByRole('heading', { name: 'No futures prices yet' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load prices' }));

    await waitFor(() => expect(api.queueFuturesRefresh).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Loading prices…' })).toBeDisabled();
  });

  it('shows the queue error next to the button', async () => {
    const user = userEvent.setup();
    api.getFuturesDashboard.mockResolvedValue(dashboard({ missing_symbols: ['GC=F'] }));
    api.queueFuturesRefresh.mockRejectedValue(new Error('503'));
    renderAt('/futures');

    expect(await screen.findByText('1 contract has no prices yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load prices' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not queue the refresh');
  });
});

describe('FuturesDetailPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    getCotHistory.mockReset();
  });

  it('shows the chart, performance stats and links back', async () => {
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    api.getFuturesHistory.mockResolvedValue({
      symbol: 'GC=F', name: 'Gold', exchange: 'COMEX', category: 'metals', cot_slug: null, period: '1y',
      bars: [{ date: '2026-10-27', open: 1, high: 1, low: 1, close: 1, volume: 1 }],
    });
    renderAt('/futures/gc');

    expect(await screen.findByRole('heading', { name: 'Gold' })).toBeInTheDocument();
    expect(await screen.findByTestId('price-chart')).toHaveTextContent('1 bars');
    expect(api.getFuturesHistory).toHaveBeenCalledWith('GC', '1y');
    expect(screen.getByText('Downtrend')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Futures' })).toHaveAttribute('href', '/futures');
    expect(screen.queryByRole('heading', { name: 'CFTC positioning' })).not.toBeInTheDocument();
  });

  it('changes the chart period', async () => {
    const user = userEvent.setup();
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    api.getFuturesHistory.mockResolvedValue({ symbol: 'ES=F', name: 'E-mini S&P 500', bars: [] });
    renderAt('/futures/ES');

    await user.click(await screen.findByRole('button', { name: '3M' }));

    await waitFor(() => expect(api.getFuturesHistory).toHaveBeenLastCalledWith('ES', '3mo'));
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('says so when the symbol is not a tracked contract', async () => {
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    api.getFuturesHistory.mockRejectedValue({ response: { data: { detail: { code: 'futures_contract_unknown' } } } });
    renderAt('/futures/AAPL');

    expect(await screen.findByRole('heading', { name: 'AAPL is not a tracked futures contract' })).toBeInTheDocument();
  });

  it('keeps the page usable when CFTC positioning is unavailable', async () => {
    api.getFuturesDashboard.mockResolvedValue(dashboard());
    api.getFuturesHistory.mockResolvedValue({ symbol: 'ES=F', name: 'E-mini S&P 500', bars: [] });
    getCotHistory.mockRejectedValue(new Error('404'));
    renderAt('/futures/ES');

    expect(await screen.findByRole('heading', { name: 'CFTC positioning' })).toBeInTheDocument();
    expect(await screen.findByText('CFTC positioning is not available yet.')).toBeInTheDocument();
    expect(getCotHistory).toHaveBeenCalledWith('sp-500', '1y');
  });
});
