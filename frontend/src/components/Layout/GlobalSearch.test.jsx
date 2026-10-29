import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GlobalSearch from './GlobalSearch';
import { renderWithProviders } from '../../test/renderWithProviders';

const searchStocks = vi.hoisted(() => vi.fn());
vi.mock('../../api/stocks', async (importOriginal) => ({
  ...(await importOriginal()),
  searchStocks,
}));

function CurrentPath() {
  return <output aria-label="path">{useLocation().pathname}</output>;
}

const pages = [
  { path: '/', label: 'Daily' },
  { path: '/breadth', label: 'Breadth' },
];

function renderSearch() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <GlobalSearch pages={pages} />
      <Routes><Route path="*" element={<CurrentPath />} /></Routes>
    </MemoryRouter>,
  );
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    searchStocks.mockReset().mockResolvedValue([]);
  });

  it('opens with Ctrl+K and finds a symbol by company name', async () => {
    const user = userEvent.setup();
    searchStocks.mockResolvedValue([{ symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology' }]);
    renderSearch();

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByPlaceholderText('Ticker or company name'), 'nvidia');

    expect(await screen.findByRole('option', { name: /NVDA.*NVIDIA Corp/ })).toBeInTheDocument();
    expect(searchStocks).toHaveBeenLastCalledWith('nvidia', 8);
    await user.keyboard('{Enter}');

    expect(screen.getByLabelText('path')).toHaveTextContent('/stocks/NVDA');
    expect(screen.queryByPlaceholderText('Ticker or company name')).not.toBeInTheDocument();
  });

  it('still opens a typed ticker the search does not know', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole('button', { name: 'Search symbols' }));
    await user.type(screen.getByPlaceholderText('Ticker or company name'), '0700.hk');
    await user.click(await screen.findByRole('option', { name: 'Open 0700.HK' }));

    expect(screen.getByLabelText('path')).toHaveTextContent('/stocks/0700.HK');
  });

  it('jumps to a page by name', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.keyboard('/');
    await user.type(screen.getByPlaceholderText('Ticker or company name'), 'brea');
    await user.click(screen.getByRole('option', { name: 'Breadth' }));

    expect(screen.getByLabelText('path')).toHaveTextContent('/breadth');
  });

  it('keeps the ticker fallback when search fails', async () => {
    const user = userEvent.setup();
    searchStocks.mockRejectedValue(new Error('503'));
    renderSearch();

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByPlaceholderText('Ticker or company name'), 'aapl');

    await waitFor(() => expect(screen.getByText(/Symbol search is unavailable/)).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Open AAPL' })).toBeInTheDocument();
  });
});
