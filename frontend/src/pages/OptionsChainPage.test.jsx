import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OptionsChainPage from './OptionsChainPage';
import { renderWithProviders } from '../test/renderWithProviders';

const getOptionsChain = vi.hoisted(() => vi.fn());
vi.mock('../api/optionsChain', async (importOriginal) => ({ ...(await importOriginal()), getOptionsChain }));
// Recharts needs layout; the page logic is what is under test here.
vi.mock('../features/optionsChain/ChainCharts', () => ({
  IvSmileChart: () => <div>iv smile</div>,
  GexByStrikeChart: () => <div>gex chart</div>,
}));

const metric = (value) => ({ available: value != null, value: value ?? null, reason_codes: value == null ? ['gex_inputs_unavailable'] : [] });
const quote = (iv, delta) => ({ bid: 1.1, ask: 1.25, last: 1.2, volume: 120, open_interest: 900, implied_volatility: iv, delta });

const chain = (overrides = {}) => ({
  symbol: 'NVDA',
  spot: 101.5,
  spot_source: 'cached_close',
  expirations: ['2026-11-20', '2026-12-18'],
  expiration: '2026-11-20',
  as_of: '2026-10-29',
  days_to_expiration: 22,
  fetched_at: '2026-10-29T15:00:00Z',
  risk_free_rate: 0.042,
  dividend_yield: 0,
  metrics: {
    max_pain: metric(100), net_gex: metric(null), gamma_flip: metric(null), call_wall: metric(105), put_wall: metric(95),
    atm_iv: metric(0.452), skew_25_delta: metric(0.031), realized_volatility: metric(0.38), vrp: metric(0.072),
    call_put_volume_ratio: metric(1.8), volume_oi_ratio: metric(0.4),
  },
  gex_by_strike: [[100, 1e6]],
  rows: Array.from({ length: 30 }, (_, i) => {
    const strike = 70 + i * 2;
    return { strike, call: quote(0.45, 0.5), put: i === 0 ? null : quote(0.5, -0.5) };
  }),
  ...overrides,
});

const renderAt = (path = '/chain/nvda') => renderWithProviders(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/chain/:symbol" element={<OptionsChainPage />} /></Routes>
  </MemoryRouter>,
);

describe('OptionsChainPage', () => {
  // Block body: a function returned from beforeEach runs as teardown.
  beforeEach(() => { getOptionsChain.mockReset(); });

  it('shows spot, analytics and a near-spot chain window', async () => {
    getOptionsChain.mockResolvedValue(chain());
    renderAt();

    expect(await screen.findByRole('heading', { name: 'NVDA options' })).toBeInTheDocument();
    expect(getOptionsChain).toHaveBeenCalledWith('NVDA', null);
    expect((await screen.findByText('ATM IV')).nextSibling).toHaveTextContent('45.2%');
    expect(screen.getByText('25Δ put − call skew').nextSibling).toHaveTextContent('+3.1 pts');
    expect(screen.getByText('Est. net GEX').nextSibling).toHaveTextContent('—');
    expect(screen.getByText('Est. net GEX').parentElement).toHaveAttribute('title', 'Needs a risk-free rate and open interest');

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('rowheader')).toHaveLength(21);
    expect(within(table).getByRole('rowheader', { name: /102\.00.*at the money/ })).toBeInTheDocument();
  });

  it('switches to all strikes and to another expiration', async () => {
    const user = userEvent.setup();
    getOptionsChain.mockImplementation((_symbol, expiration) => Promise.resolve(
      chain(expiration ? { expiration, days_to_expiration: 50 } : {}),
    ));
    renderAt();

    await user.click(await screen.findByRole('button', { name: 'All 30 strikes' }));
    expect(within(screen.getByRole('table')).getAllByRole('rowheader')).toHaveLength(30);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Expiration' }), '2026-12-18');
    await waitFor(() => expect(getOptionsChain).toHaveBeenLastCalledWith('NVDA', '2026-12-18'));
    expect(await screen.findByRole('heading', { name: '2026-12-18 · 50 days' })).toBeInTheDocument();
  });

  const rejectWith = (code) => getOptionsChain.mockImplementation(() => Promise.reject(
    Object.assign(new Error('Request failed'), { response: { data: { detail: { code } } } }),
  ));

  it('explains a symbol without listed options, with nothing to retry', async () => {
    rejectWith('options_chain_unavailable');
    renderAt('/chain/ZZZZ');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No listed options were found for this symbol.');
    expect(within(alert).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('explains provider throttling and offers a retry', async () => {
    rejectWith('options_provider_throttled');
    renderAt('/chain/NVDA');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('rate-limiting requests');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
