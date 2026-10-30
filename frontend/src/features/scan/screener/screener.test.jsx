import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoolSelect, RangePresetSelect } from './FilterControls';
import { FILTER_GRID, matchRangePreset } from './filterGridConfig';
import ScreenerFilterGrid from './ScreenerFilterGrid';
import ScreenerTable, { pageItems } from './ScreenerTable';
import { SCREENER_VIEWS } from './screenerViews';

const PRESETS = [
  { label: 'Over 80', value: { min: 80, max: null } },
  { label: 'Under 20', value: { min: null, max: 20 } },
];

describe('matchRangePreset', () => {
  it('finds the preset with the same bounds and treats undefined as open', () => {
    expect(matchRangePreset(PRESETS, { min: 80 })).toBe(PRESETS[0]);
    expect(matchRangePreset(PRESETS, { min: null, max: 20 })).toBe(PRESETS[1]);
  });

  it('returns null for no value and for a typed range no preset covers', () => {
    expect(matchRangePreset(PRESETS, { min: null, max: null })).toBeNull();
    expect(matchRangePreset(PRESETS, { min: 75, max: null })).toBeNull();
  });

  it('only lists filter keys once in the grid', () => {
    const keys = FILTER_GRID.map((spec) => spec.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('RangePresetSelect', () => {
  it('applies a preset as a range and clears it with Any', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangePresetSelect id="rs" label="RS" value={{ min: null, max: null }} onChange={onChange} presets={PRESETS} />);

    await user.selectOptions(screen.getByRole('combobox'), 'Over 80');
    expect(onChange).toHaveBeenLastCalledWith({ min: 80, max: null });

    await user.selectOptions(screen.getByRole('combobox'), 'Any');
    expect(onChange).toHaveBeenLastCalledWith({ min: null, max: null });
  });

  it('shows a range no preset matches as custom, and commits typed bounds on Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangePresetSelect id="rs" label="RS" value={{ min: 75, max: null }} onChange={onChange} presets={PRESETS} minOnly />);

    expect(screen.getByRole('combobox')).toHaveDisplayValue('Custom…');
    const min = screen.getByRole('spinbutton', { name: 'RS Min' });
    expect(min).toHaveValue(75);
    expect(screen.queryByRole('spinbutton', { name: 'RS Max' })).not.toBeInTheDocument();

    await user.clear(min);
    await user.type(min, '85{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ min: 85, max: null });
  });
});

describe('BoolSelect', () => {
  it('maps Any / Yes / No to null / true / false', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BoolSelect id="vcp" value={null} onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox'), 'Yes');
    expect(onChange).toHaveBeenLastCalledWith(true);
    await user.selectOptions(screen.getByRole('combobox'), 'No');
    expect(onChange).toHaveBeenLastCalledWith(false);
    await user.selectOptions(screen.getByRole('combobox'), 'Any');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('ScreenerFilterGrid', () => {
  const filters = { symbolSearch: '', rsRating: { min: 80, max: null }, vcpDetected: null };

  it('labels every control, counts active filters per tab and removes one from its chip', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ScreenerFilterGrid
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={vi.fn()}
        presetsEnabled={false}
      />,
    );

    expect(screen.getByLabelText('Ticker')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Technical/ }));
    expect(screen.getByLabelText('RS rating')).toHaveDisplayValue('Over 80');
    expect(within(screen.getByRole('button', { name: /Technical/ })).getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove RS: ≥80' }));
    expect(onFilterChange).toHaveBeenCalledWith('rsRating', { min: null, max: null });
  });
});

describe('pageItems', () => {
  it('keeps the ends and the current page ±2, with gaps between', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(10, 503)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 503]);
    expect(pageItems(503, 503)).toEqual([1, 'gap', 501, 502, 503]);
  });
});

describe('ScreenerTable', () => {
  const overview = SCREENER_VIEWS.find((view) => view.id === 'overview');
  const rows = [
    { symbol: 'NVDA', company_name: 'NVIDIA', current_price: 900, currency: 'USD', price_change_1d: 2.5, composite_score: 91.2 },
    { symbol: 'AAPL', company_name: 'Apple', current_price: 200, currency: 'USD', price_change_1d: -1.25, composite_score: 55 },
  ];
  const props = {
    rows,
    columns: overview.columns,
    page: 2,
    perPage: 20,
    total: 45,
    sortBy: 'composite_score',
    sortOrder: 'desc',
  };

  it('numbers rows across pages, signs changes and marks the active sort', () => {
    render(<ScreenerTable {...props} onSortChange={vi.fn()} onPageChange={vi.fn()} />);

    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('21')).toBeInTheDocument();
    expect(within(first).getByText('+2.50%')).toBeInTheDocument();
    expect(within(second).getByText('-1.25%')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Score' })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByText('21–40 of 45')).toBeInTheDocument();
  });

  it('sorts a new column high-to-low, flips the active one, and opens the chart from a row', () => {
    const onSortChange = vi.fn();
    const onOpenChart = vi.fn();
    render(<ScreenerTable {...props} onSortChange={onSortChange} onPageChange={vi.fn()} onOpenChart={onOpenChart} />);

    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    expect(onSortChange).toHaveBeenLastCalledWith('current_price', 'desc');
    fireEvent.click(screen.getByRole('button', { name: 'Score' }));
    expect(onSortChange).toHaveBeenLastCalledWith('composite_score', 'asc');

    fireEvent.click(screen.getByText('AAPL'));
    expect(onOpenChart).toHaveBeenCalledWith('AAPL');
  });

  it('moves between pages and resets to page 1 when the page size changes', () => {
    const onPageChange = vi.fn();
    const onPerPageChange = vi.fn();
    render(<ScreenerTable {...props} onSortChange={vi.fn()} onPageChange={onPageChange} onPerPageChange={onPerPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    fireEvent.change(screen.getByRole('combobox', { name: 'Rows' }), { target: { value: '50' } });
    expect(onPerPageChange).toHaveBeenCalledWith(50);
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });
});
