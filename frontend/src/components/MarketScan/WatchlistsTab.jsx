/**
 * Watchlists Tab Component
 *
 * Main tab for user-defined watchlists display.
 */
import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Plus, RefreshCw, Settings } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';

import { getWatchlists, getWatchlistData, getWatchlistStewardship } from '../../api/userWatchlists';
import WatchlistTable from './WatchlistTable';
import UserWatchlistManager from './UserWatchlistManager';
import { useStrategyProfileData } from '../../contexts/StrategyProfileContext';

// Defers the lightweight-charts bundle until a chart is actually opened.
const WatchlistChartModal = lazy(() => import('./WatchlistChartModal'));

const STATUSES = ['strengthening', 'unchanged', 'deteriorating', 'exit_risk', 'missing_from_run'];
const STATUS_FILTERS = [
  ['all', 'All'],
  ['strengthening', 'Strengthening'],
  ['unchanged', 'Unchanged'],
  ['deteriorating', 'Deteriorating'],
  ['exit_risk', 'Exit Risk'],
  ['missing_from_run', 'Missing'],
];

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-md border border-border p-0.5">
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => { if (value !== optionValue) onChange(optionValue); }}
          className={cn(
            'h-9 cursor-pointer rounded-sm px-3 text-xs font-semibold whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
            value === optionValue ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
          )}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

function IconAction({ label, onClick, disabled, children }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading watchlist" className="flex flex-col gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="h-8 rounded bg-surface-subtle motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

function WatchlistsTab() {
  const { requestProfile } = useStrategyProfileData();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    data: watchlistsData,
    isLoading: watchlistsLoading,
    error: watchlistsError,
    refetch: refetchWatchlists,
  } = useQuery({
    queryKey: ['userWatchlists'],
    queryFn: getWatchlists,
  });

  const watchlists = useMemo(() => watchlistsData?.watchlists || [], [watchlistsData]);

  useEffect(() => {
    if (!selectedWatchlistId && watchlists.length > 0) {
      setSelectedWatchlistId(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlistId]);

  const {
    data: watchlistData,
    isLoading: dataLoading,
    error: dataError,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['userWatchlistData', selectedWatchlistId],
    queryFn: () => getWatchlistData(selectedWatchlistId),
    enabled: !!selectedWatchlistId,
  });

  const canLoadStewardship = !!selectedWatchlistId && !!watchlistData && !!requestProfile;

  const {
    data: stewardshipData,
    isLoading: stewardshipLoading,
    error: stewardshipError,
    refetch: refetchStewardship,
  } = useQuery({
    queryKey: ['userWatchlistStewardship', selectedWatchlistId, requestProfile],
    queryFn: () => getWatchlistStewardship(selectedWatchlistId, requestProfile),
    enabled: canLoadStewardship,
  });

  const stewardshipBySymbol = useMemo(
    () => Object.fromEntries((stewardshipData?.items || []).map((item) => [item.symbol, item])),
    [stewardshipData]
  );
  const stewardshipOrder = useMemo(
    () => Object.fromEntries((stewardshipData?.items || []).map((item, index) => [item.symbol, index])),
    [stewardshipData]
  );

  const filteredWatchlistData = useMemo(() => {
    if (!watchlistData) {
      return null;
    }
    const filteredItems = [...(watchlistData.items || [])]
      .filter((item) => statusFilter === 'all' || stewardshipBySymbol[item.symbol]?.status === statusFilter)
      .sort((left, right) => {
        const leftIndex = stewardshipOrder[left.symbol] ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = stewardshipOrder[right.symbol] ?? Number.MAX_SAFE_INTEGER;
        return leftIndex - rightIndex;
      });
    return { ...watchlistData, items: filteredItems };
  }, [statusFilter, stewardshipBySymbol, stewardshipOrder, watchlistData]);

  const handleRefresh = () => {
    refetchWatchlists();
    if (selectedWatchlistId) {
      refetchData();
      if (canLoadStewardship) {
        refetchStewardship();
      }
    }
  };

  const handleWatchlistChange = (newWatchlistId) => {
    setSelectedWatchlistId(newWatchlistId);
    setStatusFilter('all');
  };

  const handleOpenChart = (symbol) => {
    setSelectedSymbol(symbol);
    setChartModalOpen(true);
  };

  const handleDownloadWatchlist = () => {
    if (!watchlistData?.items?.length) return;

    const csvContent = watchlistData.items
      .map((item) => item.symbol)
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${watchlistData.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const watchlistSymbols = watchlistData?.items?.map((item) => item.symbol) || [];

  if (watchlistsLoading) {
    return (
      <div className="tw p-2">
        <TableSkeleton />
      </div>
    );
  }

  if (watchlistsError) {
    return <Notice tone="error" className="tw">Unable to load watchlists: {watchlistsError.message}</Notice>;
  }

  return (
    <div className="tw flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Watchlist:</span>
          {watchlists.length > 0 ? (
            <Segmented
              label="Watchlist"
              options={watchlists.map((watchlist) => [watchlist.id, watchlist.name])}
              value={selectedWatchlistId}
              onChange={handleWatchlistChange}
            />
          ) : (
            <span className="text-sm text-muted-foreground">No watchlists created yet</span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <IconAction
            label="Download watchlist as CSV"
            onClick={handleDownloadWatchlist}
            disabled={!watchlistData?.items?.length || dataLoading}
          >
            <Download aria-hidden="true" />
          </IconAction>
          <IconAction label="Refresh data" onClick={handleRefresh}>
            <RefreshCw aria-hidden="true" />
          </IconAction>
          <IconAction label="Manage watchlists" onClick={() => setManagerOpen(true)}>
            <Settings aria-hidden="true" />
          </IconAction>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {dataLoading ? (
          <TableSkeleton />
        ) : dataError ? (
          <Notice tone="error">Unable to load watchlist data: {dataError.message}</Notice>
        ) : watchlistData ? (
          <div className="flex flex-col gap-2">
            {stewardshipError && (
              <Notice tone="warning">
                Stewardship context is unavailable: {stewardshipError.message}
              </Notice>
            )}
            {stewardshipData && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((status) => (
                    <Badge key={status}>
                      {`${status.replaceAll('_', ' ')}: ${stewardshipData.summary_counts?.[status] ?? 0}`}
                    </Badge>
                  ))}
                </div>
                <Segmented
                  label="Filter by stewardship status"
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
            )}
            <WatchlistTable
              watchlistData={filteredWatchlistData}
              stewardshipBySymbol={stewardshipBySymbol}
              stewardshipLoading={stewardshipLoading}
              onRefresh={handleRefresh}
              onOpenChart={handleOpenChart}
            />
          </div>
        ) : watchlists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No watchlists yet. Create your first watchlist to get started.
            </p>
            <Button onClick={() => setManagerOpen(true)}>
              <Plus aria-hidden="true" />
              Create a watchlist
            </Button>
          </div>
        ) : null}
      </div>

      <UserWatchlistManager open={managerOpen} onClose={() => setManagerOpen(false)} onUpdate={handleRefresh} />

      {chartModalOpen && (
        <Suspense fallback={null}>
          <WatchlistChartModal
            open={chartModalOpen}
            onClose={() => setChartModalOpen(false)}
            initialSymbol={selectedSymbol}
            symbols={watchlistSymbols}
          />
        </Suspense>
      )}
    </div>
  );
}

export default WatchlistsTab;
