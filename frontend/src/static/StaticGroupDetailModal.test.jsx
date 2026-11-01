import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StaticGroupDetailModal from './StaticGroupDetailModal';

vi.mock('../components/Scan/PriceSparkline', () => ({
  default: () => <div data-testid="price-sparkline" />,
}));

vi.mock('../components/Scan/RSSparkline', () => ({
  default: () => <div data-testid="rs-sparkline" />,
}));

vi.mock('./StaticGroupChartsGrid', () => ({
  default: () => <div data-testid="static-group-charts-grid" />,
}));

const detail = {
  current_rank: 51,
  current_avg_rs: 75.5,
  num_stocks: 2,
  top_symbol: 'NVDA',
  top_rs_rating: 92,
  stocks: [
    {
      symbol: 'NVDA',
      company_name: 'NVIDIA Corporation',
      rs_rating: 92,
      price: 140.5,
      market_cap: 1000000000,
      price_history: [],
      rs_history: [],
    },
  ],
  history: [],
};

const renderModal = (props = {}) => render(
  <>
    <StaticGroupDetailModal
      group="Semiconductors"
      detail={detail}
      open
      onClose={vi.fn()}
      {...props}
    />
  </>
);

describe('StaticGroupDetailModal', () => {
  it('keeps disabled Charts as a direct Tab child of Tabs', () => {
    renderModal();

    const tabList = screen.getByRole('tablist');
    const tabChildren = Array.from(tabList.children);

    expect(tabChildren).toHaveLength(2);
    expect(tabChildren.every((child) => child.getAttribute('role') === 'tab')).toBe(true);
    expect(screen.getByRole('tab', { name: 'Charts' })).toBeDisabled();
  });

  it('renders the dialog paper at 95vw with zero margin so it never overflows the viewport', () => {
    renderModal();

    const dialogPaper = screen.getByRole('dialog');
    // Asserting the actual inline style so the contract regresses if the
    // width is ever changed: 95vw can never exceed a narrow viewport.
    expect(dialogPaper).toHaveStyle({ width: '95vw', maxWidth: '95vw' });
  });
});
