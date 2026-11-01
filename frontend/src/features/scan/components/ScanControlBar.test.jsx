import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/renderWithProviders';
import ScanControlBar from './ScanControlBar';

const baseProps = {
  currentScanId: 'scan-1',
  scanHistory: { scans: [] },
  onLoadScan: vi.fn(),
  universeMarket: 'US',
  universeScope: null,
  onUniverseMarketChange: vi.fn(),
  onUniverseScopeChange: vi.fn(),
  universeStats: null,
  universeSelections: { markets: [{ value: 'US', label: 'United States' }] },
  statsLoading: false,
  selectedScreeners: ['minervini'],
  onScreenerToggle: vi.fn(),
  includeVcp: false,
  onIncludeVcpChange: vi.fn(),
  compositeMethod: 'weighted_average',
  onCompositeMethodChange: vi.fn(),
  createScanPending: false,
  scanStatus: 'completed',
  scanRequestReady: true,
  onStartScan: vi.fn(),
  onCancelScan: vi.fn(),
  cancelScanPending: false,
  statusData: null,
  customFilters: {},
  onCustomFiltersChange: vi.fn(),
  createScanError: null,
  cancelScanError: null,
};

describe('ScanControlBar', () => {
  it('keeps scan setup behind "New scan" while a scan is shown', () => {
    renderWithProviders(<ScanControlBar {...baseProps} />);

    expect(screen.getByRole('combobox', { name: 'Previous Scans' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Market' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scan' })).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'New scan' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);

    expect(screen.getByRole('combobox', { name: 'Market' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide scan setup' }));
    expect(screen.queryByRole('combobox', { name: 'Market' })).not.toBeInTheDocument();
  });

  it('opens the setup when nothing is loaded yet, and closes it once a scan loads', () => {
    const { rerender } = renderWithProviders(<ScanControlBar {...baseProps} currentScanId={null} />);

    expect(screen.getByRole('combobox', { name: 'Market' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide scan setup' })).toHaveAttribute('aria-expanded', 'true');

    rerender(<ScanControlBar {...baseProps} currentScanId="scan-1" />);
    expect(screen.queryByRole('combobox', { name: 'Market' })).not.toBeInTheDocument();
  });

  it('keeps the setup open across a scan load once the user opened it', () => {
    const { rerender } = renderWithProviders(<ScanControlBar {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'New scan' }));

    rerender(<ScanControlBar {...baseProps} currentScanId="scan-2" />);
    expect(screen.getByRole('combobox', { name: 'Market' })).toBeInTheDocument();
  });

  it('keeps Cancel within reach while a scan runs, with the setup closed', () => {
    renderWithProviders(<ScanControlBar {...baseProps} scanStatus="running" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(baseProps.onCancelScan).toHaveBeenCalled();
  });
});
