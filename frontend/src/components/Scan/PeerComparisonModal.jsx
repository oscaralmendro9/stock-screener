import { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, LineChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';

import apiClient from '../../api/client';
import { getStockPeers } from '../../api/stocks';
import RSSparkline from './RSSparkline';
import AddToWatchlistMenu from '../common/AddToWatchlistMenu';

/**
 * Fetch peer stocks — scan-based when scanId is provided, standalone otherwise.
 */
const fetchPeers = async (scanId, symbol) => {
  if (scanId) {
    const response = await apiClient.get(`/v1/scans/${scanId}/peers/${symbol}`);
    return response.data;
  }
  return getStockPeers(symbol);
};

const SORT_COLUMNS = [
  ['composite_score', 'Composite Score'],
  ['minervini_score', 'Minervini'],
  ['rs_rating_1m', 'RS 1M'],
  ['rs_rating_3m', 'RS 3M'],
  ['rs_rating_12m', 'RS 12M'],
  ['stage', 'Stage'],
  ['current_price', 'Price'],
  ['eps_growth_qq', 'EPS Growth'],
  ['sales_growth_qq', 'Sales Growth'],
];

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 font-medium';
const TD = 'border-b border-border px-2 py-1.5 tabular-nums';

const growthClass = (value) => (
  value >= 20 ? 'text-gain' : value < 0 ? 'text-loss' : ''
);

function SortHeader({ field, label, sortBy, sortOrder, onSort, align = 'center' }) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(TH, align === 'left' ? 'text-left' : 'text-center', active ? 'text-foreground' : 'text-muted-foreground')}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm whitespace-nowrap outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon aria-hidden="true" className={cn('size-3', !active && 'opacity-40')} />
      </button>
    </th>
  );
}

/**
 * Peer Comparison Modal
 * Shows all stocks in the same IBD industry group
 */
function PeerComparisonModal({ open, onClose, scanId, symbol, onOpenChart }) {
  const { data: peers, isLoading, error } = useQuery({
    queryKey: ['peers', scanId || 'standalone', symbol],
    queryFn: () => fetchPeers(scanId, symbol),
    enabled: open && !!symbol,
    staleTime: 10 * 60 * 1000,
  });

  const [sortBy, setSortBy] = useState('composite_score');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleRequestSort = (property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  const sortedPeers = useMemo(() => {
    if (!peers) return [];
    return [...peers].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      // Handle null/undefined values - push them to the end
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // String comparison for symbol
      if (sortBy === 'symbol') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numeric comparison for all other fields
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [peers, sortBy, sortOrder]);

  const industryGroup = peers && peers.length > 0 ? peers[0].ibd_industry_group : '';
  const sortProps = { sortBy, sortOrder, onSort: handleRequestSort };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title={`Industry Peers: ${symbol ?? ''}`}
        size="xl"
        className="sm:min-h-[70dvh]"
        footer={<DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>}
      >
        <p className="-mt-1 mb-3 text-sm text-muted-foreground">{industryGroup || (isLoading ? 'Loading...' : '')}</p>

        {isLoading && (
          <div aria-busy="true" aria-label="Loading peers" className="flex flex-col gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-9 rounded bg-surface-subtle motion-safe:animate-pulse" />
            ))}
          </div>
        )}

        {error && <Notice tone="error">Error loading peers: {error.message}</Notice>}

        {peers && peers.length > 0 && (
          <>
            <p className="mb-2 text-sm text-muted-foreground tabular-nums">
              Found {peers.length} stocks in this industry group
            </p>
            <div className="max-h-[60dvh] overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, 'text-left text-muted-foreground')}>Chart</th>
                    <SortHeader field="symbol" label="Symbol" align="left" {...sortProps} />
                    <th scope="col" className={cn(TH, 'text-center text-muted-foreground')}>RS Trend</th>
                    {SORT_COLUMNS.map(([field, label]) => (
                      <SortHeader key={field} field={field} label={label} {...sortProps} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPeers.map((peer) => {
                    const current = peer.symbol === symbol;
                    return (
                      <tr
                        key={peer.symbol}
                        aria-current={current ? 'true' : undefined}
                        className={cn('hover:bg-surface-subtle', current && 'bg-accent/10')}
                      >
                        <td className={TD}>
                          <span className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              aria-label={`View ${peer.symbol} chart`}
                              title="View chart"
                              onClick={() => {
                                onClose();
                                onOpenChart(peer.symbol);
                              }}
                              className="grid size-7 cursor-pointer place-items-center rounded-md text-accent outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <LineChart aria-hidden="true" className="size-4" />
                            </button>
                            <AddToWatchlistMenu symbols={peer.symbol} size="small" />
                          </span>
                        </td>
                        <td className={TD}>
                          <p className={cn('text-sm', current && 'font-semibold')}>{peer.symbol}</p>
                          {peer.company_name && (
                            <p className="max-w-[220px] truncate text-[11px] text-muted-foreground">{peer.company_name}</p>
                          )}
                        </td>
                        <td className={cn(TD, 'px-1 text-center')}>
                          <RSSparkline
                            data={peer.rs_sparkline_data}
                            trend={peer.rs_trend}
                            width={100}
                            height={28}
                          />
                        </td>
                        <td className={cn(TD, 'text-center font-semibold text-accent')}>{peer.composite_score?.toFixed(1) || '-'}</td>
                        <td className={cn(TD, 'text-center')}>{peer.minervini_score?.toFixed(1) || '-'}</td>
                        <td className={cn(TD, 'text-center')}>{peer.rs_rating_1m?.toFixed(1) || '-'}</td>
                        <td className={cn(TD, 'text-center')}>{peer.rs_rating_3m?.toFixed(1) || '-'}</td>
                        <td className={cn(TD, 'text-center')}>{peer.rs_rating_12m?.toFixed(1) || '-'}</td>
                        <td className={cn(TD, 'text-center')}>
                          {peer.stage && peer.stage_name
                            ? <Badge tone={peer.stage === 2 ? 'accent' : 'neutral'}>{`S${peer.stage}`}</Badge>
                            : '-'}
                        </td>
                        <td className={cn(TD, 'text-center')}>{peer.current_price ? `$${peer.current_price.toFixed(2)}` : '-'}</td>
                        <td className={cn(TD, 'text-center', growthClass(peer.eps_growth_qq))}>
                          {peer.eps_growth_qq != null ? `${peer.eps_growth_qq.toFixed(1)}%` : '-'}
                        </td>
                        <td className={cn(TD, 'text-center', growthClass(peer.sales_growth_qq))}>
                          {peer.sales_growth_qq != null ? `${peer.sales_growth_qq.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {peers && peers.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No peer data available for this stock.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PeerComparisonModal;
