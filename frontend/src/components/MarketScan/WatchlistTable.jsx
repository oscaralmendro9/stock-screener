/**
 * Watchlist Table Component
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';

import RSSparkline from '../Scan/RSSparkline';
import PriceSparkline from '../Scan/PriceSparkline';
import ActionStateBadge from '../shared/ActionStateBadge';
import OpportunityEvidenceDrawer from '../shared/OpportunityEvidenceDrawer';
import PriceChangeBar from './PriceChangeBar';
import { removeItem } from '../../api/userWatchlists';
import { invalidateWatchlistItems } from '../../api/userWatchlistQueries';

const PRICE_PERIODS = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '2w', label: '2W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '12m', label: '12M' },
];

const STEWARDSHIP_TONE = {
  strengthening: 'accent',
  deteriorating: 'warning',
  exit_risk: 'loss',
};

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-1 py-1.5 font-medium text-muted-foreground';
const TD = 'border-b border-border px-1 py-0.5';

function WatchlistTable({ watchlistData, stewardshipBySymbol = {}, onRefresh, onOpenChart }) {
  const [opportunityItemId, setOpportunityItemId] = useState(null);
  const queryClient = useQueryClient();
  const { items, price_change_bounds } = watchlistData;
  const opportunityRow = useMemo(() => {
    const stock = items?.find((item) => item.id === opportunityItemId);
    if (!stock) return null;
    const stewardship = stewardshipBySymbol[stock.symbol];
    if (!stewardship?.opportunity_state) return null;
    return { ...stock, ...stewardship };
  }, [items, opportunityItemId, stewardshipBySymbol]);
  useEffect(() => {
    if (opportunityItemId != null && opportunityRow == null) {
      setOpportunityItemId(null);
    }
  }, [opportunityItemId, opportunityRow]);

  const removeMutation = useMutation({
    mutationFn: ({ itemId }) => removeItem(itemId),
    onSuccess: (_, { watchlistId }) => {
      invalidateWatchlistItems(queryClient, watchlistId);
      if (onRefresh) onRefresh();
    },
  });

  const handleRemove = (e, itemId) => {
    e.stopPropagation();
    removeMutation.mutate({ itemId, watchlistId: watchlistData.id });
  };

  if (!items || items.length === 0) {
    return (
      <p className="tw py-8 text-center text-sm text-muted-foreground">
        No stocks in this watchlist yet. Add stocks from scan results, themes, or peer tables.
      </p>
    );
  }

  return (
    <>
      <div className="tw max-h-[calc(100dvh-180px)] overflow-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, 'w-8')}><span className="sr-only">Remove</span></th>
              <th scope="col" className={cn(TH, 'w-14 text-left')}>Symbol</th>
              <th scope="col" className={cn(TH, 'w-36 text-left')}>Company</th>
              <th scope="col" className={cn(TH, 'w-28 text-left')}>Stewardship</th>
              <th scope="col" className={cn(TH, 'w-28 text-center')}>Action</th>
              <th scope="col" className={cn(TH, 'w-14 text-center')}>Score Δ</th>
              <th scope="col" className={cn(TH, 'w-14 text-center')}>RS Δ</th>
              <th scope="col" className={cn(TH, 'w-20 text-center')}>Earnings</th>
              <th scope="col" className={cn(TH, 'w-20 text-center')}>Theme</th>
              <th scope="col" className={cn(TH, 'w-28 text-center')}>RS (30d)</th>
              <th scope="col" className={cn(TH, 'w-28 text-center')}>Price (30d)</th>
              {PRICE_PERIODS.map((period) => (
                <th key={period.key} scope="col" className={cn(TH, 'w-[70px] text-center')}>
                  {period.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((stock) => {
              const stewardship = stewardshipBySymbol[stock.symbol] || {};
              return (
                <tr
                  key={stock.id}
                  tabIndex={onOpenChart ? 0 : undefined}
                  aria-label={onOpenChart ? `Open ${stock.symbol} chart` : undefined}
                  onClick={() => onOpenChart && onOpenChart(stock.symbol)}
                  onKeyDown={(event) => {
                    // Only the row itself: Enter on the action badge or a link must not open the chart.
                    if (!onOpenChart || event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenChart(stock.symbol);
                    }
                  }}
                  className={cn(
                    'group outline-none hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    onOpenChart && 'cursor-pointer',
                  )}
                >
                  <td className={cn(TD, 'w-8')}>
                    <button
                      type="button"
                      aria-label="Remove from watchlist"
                      title="Remove from watchlist"
                      onClick={(e) => handleRemove(e, stock.id)}
                      className="grid size-6 cursor-pointer place-items-center rounded-sm text-muted-foreground opacity-0 outline-none group-hover:opacity-100 hover:text-loss focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </td>
                  <td className={cn(TD, 'w-14')}>
                    <RouterLink
                      to={`/stocks/${encodeURIComponent(stock.symbol)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold text-accent hover:underline"
                    >
                      {stock.symbol}
                    </RouterLink>
                  </td>
                  <td className={cn(TD, 'max-w-36 truncate text-[11px] text-muted-foreground')} title={stock.company_name || ''}>
                    {stock.company_name || '-'}
                  </td>
                  <td className={TD}>
                    <Badge tone={STEWARDSHIP_TONE[stewardship.status] || 'neutral'}>
                      {(stewardship.status || 'unknown').replaceAll('_', ' ')}
                    </Badge>
                  </td>
                  <td className={cn(TD, 'text-center')}>
                    <ActionStateBadge
                      state={stewardship.action_state}
                      onClick={stewardship.opportunity_state
                        ? (event) => {
                          event.stopPropagation();
                          setOpportunityItemId(stock.id);
                        }
                        : undefined}
                    />
                  </td>
                  <td className={cn(TD, 'text-center tabular-nums')}>{stewardship.score_delta?.toFixed?.(1) ?? '-'}</td>
                  <td className={cn(TD, 'text-center tabular-nums')}>{stewardship.rs_delta?.toFixed?.(1) ?? '-'}</td>
                  <td className={cn(TD, 'text-center tabular-nums')}>
                    {stewardship.days_until_earnings != null ? `${stewardship.days_until_earnings}d` : '-'}
                  </td>
                  <td className={cn(TD, 'text-center')}>{stewardship.theme_support || '-'}</td>
                  <td className={cn(TD, 'px-0.5 text-center')}>
                    <RSSparkline
                      data={stock.rs_data}
                      trend={stock.rs_trend}
                      width={100}
                      height={24}
                    />
                  </td>
                  <td className={cn(TD, 'px-0.5 text-center')}>
                    <PriceSparkline
                      data={stock.price_data}
                      trend={stock.price_trend}
                      change1d={stock.change_1d}
                      width={110}
                      height={22}
                      showChange={false}
                    />
                  </td>
                  {PRICE_PERIODS.map((period) => {
                    const change = stock[`change_${period.key}`];
                    const bounds = price_change_bounds[period.key] || { min: 0, max: 0 };
                    return (
                      <td key={period.key} className={cn(TD, 'px-0.5 text-center')}>
                        <PriceChangeBar
                          value={change}
                          min={bounds.min}
                          max={bounds.max}
                          width={65}
                          height={16}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <OpportunityEvidenceDrawer
        open={Boolean(opportunityRow)}
        row={opportunityRow}
        onClose={() => setOpportunityItemId(null)}
        opportunityTelemetrySurface="watchlist"
      />
    </>
  );
}

export default WatchlistTable;
