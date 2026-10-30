import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import PriceSparkline from '../Scan/PriceSparkline';
import RSSparkline from '../Scan/RSSparkline';
import ActionStateBadge from './ActionStateBadge';
import StockRowCard from './StockRowCard';
import { useIsMobileShell } from '../Layout/shellNav';
import { formatLocalCurrency } from '../../utils/formatUtils';
import { resolveMarketCapDisplay } from '../../utils/marketCapUtils';

const formatNumber = (value, digits = 0) => {
  if (value == null) return '-';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

// Top-ranked groups stand out by weight; color stays reserved for price direction.
const TOP_GROUP_RANK = 20;

const HEAD = 'px-3 py-2 font-medium whitespace-nowrap';
const CELL = 'px-3 py-1.5';

function TableMessage({ colSpan, className, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('px-3 py-6 text-center text-sm text-muted-foreground', className)}>
        {children}
      </td>
    </tr>
  );
}

function DailyScanRowsTable({
  title,
  subtitle,
  rows,
  // null means every row opens a chart (server mode); the static site passes
  // the set of symbols that have an exported chart bundle.
  chartEnabledSymbols = null,
  navigationSymbols = [],
  onOpenChart = null,
  emptyMessage,
  action = null,
  showRs = false,
  showRating = false,
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load rows.',
  priceSparklineWidth = 137,
  priceSparklineInnerWidth = 86,
  testId,
  scoreField = 'composite_score',
  showActionState = false,
  onOpenOpportunity = null,
  // Inside another card: drop this table's own border so cards don't nest.
  bare = false,
}) {
  const isMobile = useIsMobileShell();
  const isChartEnabled = (symbol) => (
    Boolean(onOpenChart) && (chartEnabledSymbols == null || chartEnabledSymbols.has(symbol))
  );
  const handleRowOpen = (symbol) => {
    if (isChartEnabled(symbol)) {
      onOpenChart(symbol, navigationSymbols);
    }
  };
  const colSpan = 8 + (showRs ? 1 : 0) + (showRating ? 1 : 0) + (showActionState ? 1 : 0);
  const actionBadge = (row) => (
    <ActionStateBadge
      state={row.action_state}
      onClick={row.opportunity_state && onOpenOpportunity
        ? (event) => {
          event.stopPropagation();
          onOpenOpportunity(row);
        }
        : undefined}
    />
  );
  const showLoading = isLoading && rows.length === 0;
  const showError = isError && rows.length === 0;
  const showEmpty = !isLoading && !isError && rows.length === 0;
  const Container = bare ? 'section' : Card;

  return (
    <Container data-testid={testId} className="tw overflow-hidden">
      <CardHeader className="flex-wrap items-start pb-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {subtitle ? <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </CardHeader>
      {isMobile ? (
        // Phones: one card per row instead of a 720px table that scrolls sideways.
        <>
          {showLoading ? (
            <CardContent className="flex justify-center">
              <LoaderCircle role="status" aria-label="Loading" className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none" />
            </CardContent>
          ) : null}
          {showError ? <CardContent><p role="alert" className="text-center text-sm text-loss">{errorMessage}</p></CardContent> : null}
          {showEmpty ? <CardContent><p className="text-center text-sm text-muted-foreground">{emptyMessage}</p></CardContent> : null}
          {rows.length > 0 ? (
            <ul aria-label={typeof title === 'string' ? title : undefined} className="divide-y divide-border/60 border-t border-border">
              {rows.map((row) => (
                <li key={row.symbol}>
                  <StockRowCard
                    row={row}
                    scoreField={scoreField}
                    badge={showActionState
                      ? actionBadge(row)
                      : showRating && row.rating
                        ? <Badge>{row.rating}</Badge>
                        : null}
                    meta={showRs && row.rs_rating != null ? `RS ${formatNumber(row.rs_rating, 0)}` : null}
                    onOpen={isChartEnabled(row.symbol) ? () => handleRowOpen(row.symbol) : null}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="border-y border-border bg-surface-subtle text-xs text-muted-foreground">
              <tr>
                <th scope="col" className={cn(HEAD, 'text-left')}>Symbol</th>
                <th scope="col" className={cn(HEAD, 'text-right')}>Score</th>
                {showActionState ? <th scope="col" className={cn(HEAD, 'text-left')}>Action</th> : null}
                {showRs ? <th scope="col" className={cn(HEAD, 'text-right')}>RS</th> : null}
                <th scope="col" className={cn(HEAD, 'text-right')}>Price</th>
                <th scope="col" className={cn(HEAD, 'text-right')}>MCap</th>
                {showRating ? <th scope="col" className={cn(HEAD, 'text-left')}>Rating</th> : null}
                <th scope="col" className={cn(HEAD, 'text-left')}>Price trend (30D)</th>
                <th scope="col" className={cn(HEAD, 'text-left')}>RS trend (30D)</th>
                <th scope="col" className={cn(HEAD, 'text-left')}>IBD group</th>
                <th scope="col" className={cn(HEAD, 'text-right')}>Grp rank</th>
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                <TableMessage colSpan={colSpan}>
                  <LoaderCircle role="status" aria-label="Loading" className="mx-auto size-5 animate-spin motion-reduce:animate-none" />
                </TableMessage>
              ) : null}
              {showError ? <TableMessage colSpan={colSpan} className="text-loss">{errorMessage}</TableMessage> : null}
              {rows.map((row) => {
                const rowChartEnabled = isChartEnabled(row.symbol);
                const topGroup = row.ibd_group_rank != null && row.ibd_group_rank <= TOP_GROUP_RANK;
                return (
                  <tr
                    key={row.symbol}
                    tabIndex={rowChartEnabled ? 0 : -1}
                    onClick={() => handleRowOpen(row.symbol)}
                    onKeyDown={(event) => {
                      if (!rowChartEnabled || event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleRowOpen(row.symbol);
                      }
                    }}
                    className={cn(
                      'border-b border-border/60 outline-none last:border-0 focus-visible:bg-surface-subtle',
                      rowChartEnabled && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-surface-subtle',
                    )}
                  >
                    <td className={CELL}>
                      <span className="flex max-w-48 min-w-0 flex-col">
                        <span className="font-semibold">{row.symbol}</span>
                        {row.company_name ? (
                          <span title={row.company_name} className="truncate text-xs text-muted-foreground">{row.company_name}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className={cn(CELL, 'text-right font-medium tabular-nums')}>{formatNumber(row?.[scoreField], 1)}</td>
                    {showActionState ? <td className={CELL}>{actionBadge(row)}</td> : null}
                    {showRs ? <td className={cn(CELL, 'text-right tabular-nums')}>{formatNumber(row.rs_rating, 0)}</td> : null}
                    <td className={cn(CELL, 'text-right tabular-nums')}>{formatLocalCurrency(row.current_price, row.currency)}</td>
                    <td className={cn(CELL, 'text-right tabular-nums text-muted-foreground')}>
                      {resolveMarketCapDisplay(row, null, { preferUsd: true }).formattedValue}
                    </td>
                    {showRating ? <td className={CELL}>{row.rating ? <Badge>{row.rating}</Badge> : '-'}</td> : null}
                    <td className={CELL}>
                      {row.price_sparkline_data ? (
                        <PriceSparkline
                          data={row.price_sparkline_data}
                          trend={row.price_trend}
                          change1d={row.price_change_1d}
                          industry={row.ibd_industry_group}
                          width={priceSparklineWidth}
                          height={28}
                          sparklineWidth={priceSparklineInnerWidth}
                        />
                      ) : '-'}
                    </td>
                    <td className={CELL}>
                      {row.rs_sparkline_data ? (
                        <RSSparkline
                          data={row.rs_sparkline_data}
                          trend={row.rs_trend}
                          width={117}
                          height={20}
                        />
                      ) : '-'}
                    </td>
                    <td className={cn(CELL, 'max-w-40 truncate text-xs text-muted-foreground')} title={row.ibd_industry_group || undefined}>
                      {row.ibd_industry_group || '-'}
                    </td>
                    <td className={cn(CELL, 'text-right tabular-nums', topGroup ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {row.ibd_group_rank ?? '-'}
                    </td>
                  </tr>
                );
              })}
              {showEmpty ? <TableMessage colSpan={colSpan}>{emptyMessage}</TableMessage> : null}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

export default DailyScanRowsTable;
